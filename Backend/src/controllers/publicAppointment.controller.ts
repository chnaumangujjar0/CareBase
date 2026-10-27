import { createHash, randomBytes } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { z } from "zod";
import type { Prisma } from "../generated/prisma/index.js";
import { db } from "../db/index.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { appointmentOverlapConflict } from "../utils/facility.utils.js";
import { getAuditRequestMetadata } from "../utils/audit.utils.js";
import { sendPublicAppointmentEmail } from "../services/staff-credentials-email.service.js";

const PUBLIC_TIME_ZONE = "Asia/Karachi";
const SLOT_DURATION_MINUTES = 30;
const BOOKING_CODE_LIFETIME_DAYS = 365;

const doctorIdSchema = z.uuid("Invalid doctor ID");
const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD");

const bookingSchema = z.object({
  doctorId: z.uuid("Select a doctor"),
  scheduledAt: z.coerce.date(),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  dob: z.coerce.date(),
  email: z.email().trim().toLowerCase(),
  phone: z.string().trim().max(32).nullish(),
}).refine((data) => data.dob <= new Date(), {
  message: "Date of birth cannot be in the future",
  path: ["dob"],
}).refine((data) => !data.phone || data.phone.replace(/\D/g, "").length >= 7, {
  message: "Enter a valid phone number",
  path: ["phone"],
});

const lookupSchema = z.object({
  bookingCode: z.string().trim().min(24).max(64),
  email: z.email().trim().toLowerCase(),
});

type RateBucket = { count: number; resetAt: number };
const rateBuckets = new Map<string, RateBucket>();

const rateLimit = (maxRequests: number, windowMs: number): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    if (rateBuckets.size > 5_000) {
      for (const [key, bucket] of rateBuckets) if (bucket.resetAt <= now) rateBuckets.delete(key);
    }
    const address = req.ip || req.socket.remoteAddress || "unknown";
    const key = `${address}:${req.baseUrl}${req.path}`;
    const bucket = rateBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    if (bucket.count >= maxRequests) {
      res.status(429).json(new ApiResponse(429, null, "Too many requests. Please wait and try again."));
      return;
    }
    bucket.count += 1;
    next();
  };

export const publicDirectoryRateLimit = rateLimit(120, 60_000);
export const publicBookingRateLimit = rateLimit(5, 60 * 60_000);
export const publicLookupRateLimit = rateLimit(10, 15 * 60_000);

const getLocalDateParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PUBLIC_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return { year: Number(part("year")), month: Number(part("month")), day: Number(part("day")) };
};

const formatLocalDate = ({ year, month, day }: { year: number; month: number; day: number }) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const addLocalDays = (date: string, days: number) => {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year!, month! - 1, day! + days));
  return { year: value.getUTCFullYear(), month: value.getUTCMonth() + 1, day: value.getUTCDate() };
};

const localDateToUtcStart = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  // CareBase currently onboards hospitals in Pakistan; schedules are stored in
  // the hospital's Pakistan local time (UTC+05:00).
  return new Date(Date.UTC(year!, month! - 1, day!, 0, 0) - 5 * 60 * 60_000);
};

const getPakistanScheduleParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PUBLIC_TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: string) => parts.find((item) => item.type === type)?.value ?? "0";
  const dayIndex: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const weekday = dayIndex[value("weekday")] ?? -1;
  const minuteOfDay = Number(value("hour")) * 60 + Number(value("minute"));
  return { weekday, minuteOfDay };
};

export const getPublicDoctors = asyncHandler(async (req: Request, res: Response) => {
  const querySchema = z.object({
    q: z.string().trim().max(100).optional(),
    hospital: z.string().trim().max(100).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(24),
  });
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) throw new ApiError(400, "Invalid doctor search");
  const search = parsed.data.q;
  const hospital = parsed.data.hospital;
  const where: Prisma.DoctorProfileWhereInput = {
      isActive: true,
      Department: { is: { isActive: true } },
      DoctorAvailability: { some: { isActive: true } },
      Tenant: { is: { isActive: true, approvalStatus: "approved", ...(hospital ? { name: { contains: hospital, mode: "insensitive" } } : {}) } },
      ...(search ? { OR: [
        { specialization: { contains: search, mode: "insensitive" } },
        { designation: { contains: search, mode: "insensitive" } },
        { User: { is: { name: { contains: search, mode: "insensitive" } } } },
        { Department: { is: { name: { contains: search, mode: "insensitive" } } } },
        { Tenant: { is: { name: { contains: search, mode: "insensitive" } } } },
      ] } : {}),
    };
  const [doctors, total] = await Promise.all([
    db.doctorProfile.findMany({
    where,
    select: {
      id: true,
      specialization: true,
      designation: true,
      qualifications: true,
      User: { select: { name: true } },
      Department: { select: { name: true } },
      Tenant: { select: { id: true, name: true, city: true, state: true, country: true, logo: true } },
      DoctorAvailability: {
        where: { isActive: true },
        orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }],
        select: { dayOfWeek: true, startMinute: true, endMinute: true },
      },
    },
    orderBy: [{ User: { name: "asc" } }],
    skip: (parsed.data.page - 1) * parsed.data.limit,
    take: parsed.data.limit,
  }),
    db.doctorProfile.count({ where }),
  ]);

  return res.status(200).json(new ApiResponse(200, {
    items: doctors,
    total,
    page: parsed.data.page,
    limit: parsed.data.limit,
    totalPages: Math.ceil(total / parsed.data.limit),
  }, "Available doctors fetched successfully"));
});

export const getPublicDoctorSlots = asyncHandler(async (req: Request, res: Response) => {
  const parsedDoctorId = doctorIdSchema.safeParse(req.params.doctorId);
  const parsedQuery = z.object({
    from: localDateSchema.optional(),
    days: z.coerce.number().int().min(1).max(21).default(14),
  }).safeParse(req.query);
  if (!parsedDoctorId.success) throw new ApiError(400, "A valid doctor ID is required");
  if (!parsedQuery.success) throw new ApiError(400, "Invalid availability date range");

  const doctor = await db.doctorProfile.findFirst({
    where: {
      id: parsedDoctorId.data,
      isActive: true,
      Department: { is: { isActive: true } },
      DoctorAvailability: { some: { isActive: true } },
      Tenant: { is: { isActive: true, approvalStatus: "approved" } },
    },
    select: {
      id: true,
      tenantId: true,
      DoctorAvailability: { where: { isActive: true }, select: { dayOfWeek: true, startMinute: true, endMinute: true } },
    },
  });
  if (!doctor) throw new ApiError(404, "Doctor is not available for public booking");

  const today = formatLocalDate(getLocalDateParts(new Date()));
  const from = parsedQuery.data.from ?? today;
  if (from < today) throw new ApiError(400, "Availability cannot be requested for a past date");
  const rangeStart = localDateToUtcStart(from);
  const rangeEnd = localDateToUtcStart(formatLocalDate(addLocalDays(from, parsedQuery.data.days)));
  const appointments = await db.appointment.findMany({
    where: { tenantId: doctor.tenantId, doctorId: doctor.id, status: "booked", scheduledAt: { gte: rangeStart, lt: rangeEnd } },
    select: { scheduledAt: true, durationMinutes: true },
    orderBy: { scheduledAt: "asc" },
  });

  const nowWithBookingBuffer = Date.now() + 30 * 60_000;
  const slots: Array<{ startsAt: string; localDate: string; localTime: string; timeZone: string; available: boolean }> = [];
  let firstPotentialConflict = 0;
  for (let dayOffset = 0; dayOffset < parsedQuery.data.days; dayOffset += 1) {
    const localParts = addLocalDays(from, dayOffset);
    const localDate = formatLocalDate(localParts);
    const weekday = new Date(Date.UTC(localParts.year, localParts.month - 1, localParts.day)).getUTCDay();
    const windows = doctor.DoctorAvailability.filter((window) => window.dayOfWeek === weekday);
    for (const window of windows) {
      for (let startMinute = window.startMinute; startMinute + SLOT_DURATION_MINUTES <= window.endMinute; startMinute += SLOT_DURATION_MINUTES) {
        const startsAt = new Date(localDateToUtcStart(localDate).getTime() + startMinute * 60_000);
        const endsAt = startsAt.getTime() + SLOT_DURATION_MINUTES * 60_000;
        while (
          firstPotentialConflict < appointments.length &&
          appointments[firstPotentialConflict]!.scheduledAt.getTime() +
            appointments[firstPotentialConflict]!.durationMinutes * 60_000 <= startsAt.getTime()
        ) {
          firstPotentialConflict += 1;
        }
        const nextAppointment = appointments[firstPotentialConflict];
        const hasConflict = Boolean(
          nextAppointment && nextAppointment.scheduledAt.getTime() < endsAt,
        );
        slots.push({
          startsAt: startsAt.toISOString(),
          localDate,
          localTime: `${String(Math.floor(startMinute / 60)).padStart(2, "0")}:${String(startMinute % 60).padStart(2, "0")}`,
          timeZone: PUBLIC_TIME_ZONE,
          available: startsAt.getTime() > nowWithBookingBuffer && !hasConflict,
        });
      }
    }
  }
  return res.status(200).json(new ApiResponse(200, slots, "Available appointment times fetched successfully"));
});

export const createPublicAppointment = asyncHandler(async (req: Request, res: Response) => {
  const parsed = bookingSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, "Invalid appointment details", parsed.error.issues.map(({ path, message }) => ({ path: path.join("."), message })));
  }
  const input = parsed.data;
  if (input.scheduledAt.getTime() % 60_000 !== 0 || input.scheduledAt.getMinutes() % SLOT_DURATION_MINUTES !== 0) {
    throw new ApiError(400, "Choose one of the available 30-minute appointment times");
  }
  if (input.scheduledAt.getTime() <= Date.now() + 30 * 60_000) {
    throw new ApiError(400, "Choose an appointment at least 30 minutes from now");
  }

  const { weekday, minuteOfDay } = getPakistanScheduleParts(input.scheduledAt);
  const token = randomBytes(24).toString("base64url");
  const bookingCodeHash = createHash("sha256").update(token).digest("hex");

  try {
    const result = await db.$transaction(async (trx) => {
      const doctor = await trx.doctorProfile.findFirst({
        where: {
          id: input.doctorId,
          isActive: true,
          Department: { is: { isActive: true } },
          Tenant: { is: { isActive: true, approvalStatus: "approved" } },
        },
        select: {
          id: true,
          tenantId: true,
          departmentId: true,
          User: { select: { name: true } },
          Department: { select: { name: true } },
          Tenant: { select: { name: true } },
          DoctorAvailability: { where: { isActive: true }, select: { dayOfWeek: true, startMinute: true, endMinute: true } },
        },
      });
      if (!doctor) throw new ApiError(404, "This doctor is no longer available for public booking");
      const hasAvailability = doctor.DoctorAvailability.some((window) =>
        window.dayOfWeek === weekday && window.startMinute <= minuteOfDay && window.endMinute >= minuteOfDay + SLOT_DURATION_MINUTES,
      );
      if (!hasAvailability) throw new ApiError(409, "This doctor is not available at the selected time");

      const requestedEnd = input.scheduledAt.getTime() + SLOT_DURATION_MINUTES * 60_000;
      const bookedAppointments = await trx.appointment.findMany({
        where: { tenantId: doctor.tenantId, doctorId: doctor.id, status: "booked", scheduledAt: { lt: new Date(requestedEnd) } },
        select: { scheduledAt: true, durationMinutes: true },
      });
      const overlap = bookedAppointments.some((appointment) =>
        appointment.scheduledAt.getTime() < requestedEnd &&
        appointment.scheduledAt.getTime() + appointment.durationMinutes * 60_000 > input.scheduledAt.getTime(),
      );
      if (overlap) throw new ApiError(409, "This appointment time was just booked. Please choose another time.");

      const patient = await trx.patient.create({
        data: {
          tenantId: doctor.tenantId,
          mrn: `WEB-${randomBytes(8).toString("hex").toUpperCase()}`,
          firstName: input.firstName,
          lastName: input.lastName,
          dob: input.dob,
          contactEmail: input.email,
          contactPhone: input.phone || null,
          type: "outpatient_booking",
          isActive: true,
        },
        select: { id: true, firstName: true, lastName: true },
      });
      const appointment = await trx.appointment.create({
        data: {
          tenantId: doctor.tenantId,
          patientId: patient.id,
          doctorId: doctor.id,
          departmentId: doctor.departmentId,
          scheduledAt: input.scheduledAt,
          endsAt: new Date(input.scheduledAt.getTime() + SLOT_DURATION_MINUTES * 60_000),
          durationMinutes: SLOT_DURATION_MINUTES,
          status: "booked",
          createdBy: null,
          updatedBy: null,
        },
        select: { id: true, tenantId: true, scheduledAt: true, status: true },
      });
      await trx.publicAppointmentAccess.create({
        data: {
          appointmentId: appointment.id,
          tenantId: appointment.tenantId,
          bookingCodeHash,
          contactEmail: input.email,
          expiresAt: new Date(input.scheduledAt.getTime() + BOOKING_CODE_LIFETIME_DAYS * 24 * 60 * 60_000),
        },
      });
      const { ipAddress, userAgent } = getAuditRequestMetadata(req);
      await trx.auditLog.create({
        data: {
          action: "public_book",
          entityType: "Appointment",
          entityId: appointment.id,
          tenantId: doctor.tenantId,
          ipAddress,
          userAgent,
          newValue: { doctorId: doctor.id, scheduledAt: input.scheduledAt.toISOString(), publicBooking: true },
        },
      });
      return {
        appointment,
        patient,
        hospitalName: doctor.Tenant.name,
        doctorName: doctor.User.name,
        departmentName: doctor.Department.name,
      };
    });

    req.app.get("io")?.to(`public-appointment-slots:${input.doctorId}`).emit("public:slots:changed", { doctorId: input.doctorId });

    const emailResult = await sendPublicAppointmentEmail({
      patientName: `${result.patient.firstName} ${result.patient.lastName}`,
      recipientEmail: input.email,
      bookingCode: token,
      hospitalName: result.hospitalName,
      doctorName: result.doctorName,
      departmentName: result.departmentName,
      scheduledAt: result.appointment.scheduledAt,
    });
    return res.status(201).json(new ApiResponse(201, {
      bookingCode: token,
      emailSent: emailResult.sent,
      appointment: {
        scheduledAt: result.appointment.scheduledAt,
        status: result.appointment.status,
        hospitalName: result.hospitalName,
        doctorName: result.doctorName,
        departmentName: result.departmentName,
      },
    }, "Appointment booked successfully"));
  } catch (error: unknown) {
    if (error instanceof ApiError) throw error;
    if (appointmentOverlapConflict(error) === "doctor") {
      throw new ApiError(409, "This appointment time was just booked. Please choose another time.");
    }
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      throw new ApiError(409, "Unable to create a unique patient reference. Please retry the booking.");
    }
    throw error;
  }
});

export const getPublicAppointment = asyncHandler(async (req: Request, res: Response) => {
  const parsed = lookupSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, "Enter your booking code and the email address used when booking");
  }
  const bookingCodeHash = createHash("sha256").update(parsed.data.bookingCode).digest("hex");
  const access = await db.publicAppointmentAccess.findFirst({
    where: { bookingCodeHash, contactEmail: parsed.data.email, expiresAt: { gt: new Date() } },
    select: {
      Appointment: {
        select: {
          scheduledAt: true,
          endsAt: true,
          durationMinutes: true,
          status: true,
          Patient: { select: { firstName: true, lastName: true } },
          DoctorProfile: { select: { designation: true, specialization: true, User: { select: { name: true } } } },
          Department: { select: { name: true } },
          Tenant: { select: { name: true, address: true, city: true, state: true, country: true, logo: true } },
        },
      },
    },
  });
  if (!access) throw new ApiError(404, "We could not find an active booking with those details");

  return res.status(200).json(new ApiResponse(200, access.Appointment, "Appointment fetched successfully"));
});
