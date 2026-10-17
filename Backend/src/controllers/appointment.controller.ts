import type { Request, Response } from "express";
import { z } from "zod";
import { db } from "../db/index.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { appointmentOverlapConflict } from "../utils/facility.utils.js";
import { writeAuditLog } from "../utils/audit.utils.js";

const appointmentStatusSchema = z.enum(["booked", "completed", "cancelled", "no_show"]);

const createAppointmentSchema = z.object({
  patientId: z.uuid("Invalid patient ID"),
  doctorId: z.uuid("Invalid doctor ID"),
  departmentId: z.uuid("Invalid department ID"),
  scheduledAt: z.coerce.date(),
  durationMinutes: z.number().int().min(5).max(480).default(30),
  notes: z.string().trim().max(4000).nullish(),
});

const updateAppointmentSchema = z.object({
  scheduledAt: z.coerce.date().optional(),
  durationMinutes: z.number().int().min(5).max(480).optional(),
  status: appointmentStatusSchema.optional(),
  notes: z.string().trim().max(4000).nullish(),
  version: z.number().int().positive(),
}).refine(
  ({ scheduledAt, durationMinutes, status, notes }) =>
    scheduledAt !== undefined ||
    durationMinutes !== undefined ||
    status !== undefined ||
    notes !== undefined,
  { message: "At least one appointment field is required" },
);

const appointmentInclude = {
  Patient: {
    select: {
      id: true,
      mrn: true,
      firstName: true,
      lastName: true,
      contactPhone: true,
    },
  },
  DoctorProfile: {
    select: {
      id: true,
      specialization: true,
      designation: true,
      User: { select: { id: true, name: true } },
    },
  },
  Department: { select: { id: true, name: true } },
} as const;

type AppointmentTransaction = Parameters<Parameters<typeof db.$transaction>[0]>[0];

const withAppointmentConflictHandling = async <T>(
  operation: (transaction: AppointmentTransaction) => Promise<T>,
): Promise<T> => {
  try {
    return await db.$transaction(operation);
  } catch (error) {
    const conflict = appointmentOverlapConflict(error);
    if (conflict === "doctor") {
      throw new ApiError(409, "The doctor already has a booked appointment during this time");
    }
    if (conflict === "patient") {
      throw new ApiError(409, "The patient already has a booked appointment during this time");
    }
    throw error;
  }
};

const ensureNoConflict = async (
  transaction: AppointmentTransaction,
  tenantId: string,
  doctorId: string,
  patientId: string,
  scheduledAt: Date,
  durationMinutes: number,
  excludeId?: string,
) => {
  const requestedEnd = scheduledAt.getTime() + durationMinutes * 60_000;
  const candidates = await transaction.appointment.findMany({
    where: {
      tenantId,
      status: "booked",
      scheduledAt: { lt: new Date(requestedEnd) },
      OR: [{ doctorId }, { patientId }],
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, doctorId: true, patientId: true, scheduledAt: true, durationMinutes: true },
  });

  const conflict = candidates.find((candidate) => {
    const existingStart = candidate.scheduledAt.getTime();
    const existingEnd = existingStart + candidate.durationMinutes * 60_000;
    return existingStart < requestedEnd && existingEnd > scheduledAt.getTime();
  });

  if (conflict) {
    const sameDoctor = conflict.doctorId === doctorId;
    throw new ApiError(
      409,
      sameDoctor
        ? "The doctor already has a booked appointment during this time"
        : "The patient already has a booked appointment during this time",
    );
  }
};

export const createAppointment = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId;
  const userId = req.user?.id;
  if (!tenantId || !userId) {
    throw new ApiError(401, "Authenticated tenant context is required");
  }

  const parsed = createAppointmentSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(
      400,
      "Invalid appointment details",
      parsed.error.issues.map(({ path, message }) => ({ path: path.join("."), message })),
    );
  }

  const input = parsed.data;
  const scheduledDate = new Date(input.scheduledAt);
  const scheduleday = scheduledDate.getDay();
  const scheduledTime = scheduledDate.getHours() * 60 + scheduledDate.getMinutes();

  const result = await withAppointmentConflictHandling(async (transaction) => {
    const [patient, doctor, department,availability] = await Promise.all([
      transaction.patient.findFirst({
        where: { id: input.patientId, tenantId, isActive: true, deletedAt: null },
        select: { id: true },
      }),
      transaction.doctorProfile.findFirst({
        where: { id: input.doctorId, tenantId, isActive: true },
        select: { id: true, departmentId: true },
      }),
      transaction.department.findFirst({
        where: { id: input.departmentId, tenantId, isActive: true },
        select: { id: true },
      }),
      transaction.doctorAvailability.findMany({where: {doctorId: input.doctorId, tenantId, isActive: true}})
    ]);

    if (!patient) throw new ApiError(404, "Active patient not found in this tenant");
    if (!doctor) throw new ApiError(404, "Active doctor not found in this tenant");
    if (!department) throw new ApiError(404, "Active department not found in this tenant");
    if (doctor.departmentId !== department.id) {
      throw new ApiError(400, "The selected doctor does not belong to this department");
    }
    const isWithinAvailability = availability.some((avail) =>
      avail.dayOfWeek === scheduleday
      && avail.startMinute <= scheduledTime
      && avail.endMinute >= scheduledTime + input.durationMinutes,
    );
    if (!isWithinAvailability) {
      throw new ApiError(400, "The selected doctor is not available at the requested time");
    }
    await ensureNoConflict(
      transaction,
      tenantId,
      input.doctorId,
      input.patientId,
      input.scheduledAt,
      input.durationMinutes,
    );

    return transaction.appointment.create({
      data: {
        tenantId,
        patientId: input.patientId,
        doctorId: input.doctorId,
        departmentId: input.departmentId,
        scheduledAt: input.scheduledAt,
        durationMinutes: input.durationMinutes,
        notes: input.notes || null,
        createdBy: userId,
        updatedBy: userId,
      },
      include: appointmentInclude,
    });
  });

  await writeAuditLog(req, {
    action: "create",
    entityType: "Appointment",
    entityId: result.id,
    newValue: {
      patientId: input.patientId,
      doctorId: input.doctorId,
      departmentId: input.departmentId,
      scheduledAt: input.scheduledAt.toISOString(),
      durationMinutes: input.durationMinutes,
      status: result.status,
    },
  });
  return res.status(201).json(new ApiResponse(201, result, "Appointment created successfully"));
});

const querySchema = z.object({
    doctorId: z.uuid().optional(),
    patientId: z.uuid().optional(),
    status: appointmentStatusSchema.optional(),
    onlyNotCheckedIn: z.preprocess((value) => value === true || value === "true", z.boolean()).default(false),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  }).refine(({ from, to }) => !from || !to || from <= to, {
    message: "The from date must be before the to date",
    path: ["to"],
  });

const appointmentStatsQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
}).refine(({ from, to }) => from <= to, {
  message: "The from date must be before the to date",
  path: ["to"],
});

export const getAppointments = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) throw new ApiError(401, "Authenticated tenant context is required");

  
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new ApiError(
      400,
      "Invalid appointment filters",
      parsed.error.issues.map(({ path, message }) => ({ path: path.join("."), message })),
    );
  }

  const { doctorId, patientId, status, from, to, onlyNotCheckedIn } = parsed.data;
  const appointments = await db.appointment.findMany({
    where: {
      tenantId,
      ...(doctorId ? { doctorId } : {}),
      ...(patientId ? { patientId } : {}),
      ...(status ? { status } : {}),
      ...(onlyNotCheckedIn ? { Encounter: { is: null } } : {}),
      ...(from || to
        ? { scheduledAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
        : {}),
    },
    include: appointmentInclude,
    orderBy: { scheduledAt: "asc" },
  });

  return res.status(200).json(new ApiResponse(200, appointments, "Appointments fetched successfully"));
});

export const getAppointmentOptions = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) throw new ApiError(401, "Authenticated tenant context is required");

  const doctors = await db.doctorProfile.findMany({
    where: { tenantId, isActive: true },
    select: {
      id: true,
      departmentId: true,
      specialization: true,
      designation: true,
      User: { select: { name: true } },
      Department: { select: { name: true } },
    },
    orderBy: { User: { name: "asc" } },
  });

  return res.status(200).json(new ApiResponse(200, { doctors }, "Appointment options fetched successfully"));
});

export const getAppointmentById = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) throw new ApiError(401, "Authenticated tenant context is required");

  const parsedId = z.uuid().safeParse(req.params.appointmentId);
  if (!parsedId.success) throw new ApiError(400, "A valid appointment ID is required");

  const appointment = await db.appointment.findFirst({
    where: { id: parsedId.data, tenantId },
    include: appointmentInclude,
  });
  if (!appointment) throw new ApiError(404, "Appointment not found");

  return res.status(200).json(new ApiResponse(200, appointment, "Appointment fetched successfully"));
});

export const updateAppointment = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId;
  const userId = req.user?.id;
  if (!tenantId || !userId) throw new ApiError(401, "Authenticated tenant context is required");

  const parsedId = z.uuid().safeParse(req.params.appointmentId);
  if (!parsedId.success) throw new ApiError(400, "A valid appointment ID is required");

  const parsed = updateAppointmentSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(
      400,
      "Invalid appointment update",
      parsed.error.issues.map(({ path, message }) => ({ path: path.join("."), message })),
    );
  }

  const input = parsed.data;
  const result = await withAppointmentConflictHandling(async (transaction) => {
    const current = await transaction.appointment.findFirst({
      where: { id: parsedId.data, tenantId },
    });
    if (!current) throw new ApiError(404, "Appointment not found");
    if (current.version !== input.version) {
      throw new ApiError(409, "Appointment was changed by another user; refresh and try again");
    }
    const oldValue = {
      scheduledAt: current.scheduledAt.toISOString(),
      durationMinutes: current.durationMinutes,
      status: current.status,
      notesPresent: Boolean(current.notes),
    };

    const scheduledAt = input.scheduledAt ?? current.scheduledAt;
    const durationMinutes = input.durationMinutes ?? current.durationMinutes;
    const scheduleChanged =
      input.scheduledAt !== undefined || input.durationMinutes !== undefined;
    if (scheduleChanged && current.status !== "booked") {
      throw new ApiError(409, "Only booked appointments can be rescheduled");
    }
    if (input.status !== undefined && current.status !== "booked" && input.status !== current.status) {
      throw new ApiError(409, "Only booked appointments can change status");
    }

    if (scheduleChanged) {
      await ensureNoConflict(
        transaction,
        tenantId,
        current.doctorId,
        current.patientId,
        scheduledAt,
        durationMinutes,
        current.id,
      );
    }

    const updated = await transaction.appointment.updateMany({
      where: { id: current.id, tenantId, version: current.version },
      data: {
        ...(input.scheduledAt ? { scheduledAt: input.scheduledAt } : {}),
        ...(input.durationMinutes ? { durationMinutes: input.durationMinutes } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
        updatedBy: userId,
        version: { increment: 1 },
      },
    });
    if (updated.count === 0) {
      throw new ApiError(409, "Appointment was changed by another user; refresh and try again");
    }

    const updatedAppointment = await transaction.appointment.findFirst({
      where: { id: current.id, tenantId },
      include: appointmentInclude,
    });
    return { appointment: updatedAppointment, oldValue };
  });

  await writeAuditLog(req, {
    action: "update",
    entityType: "Appointment",
    entityId: result.appointment?.id ?? parsedId.data,
    oldValue: result.oldValue,
    newValue: result.appointment ? {
      scheduledAt: result.appointment.scheduledAt.toISOString(),
      durationMinutes: result.appointment.durationMinutes,
      status: result.appointment.status,
      notesPresent: Boolean(result.appointment.notes),
    } : {},
  });
  return res.status(200).json(new ApiResponse(200, result.appointment, "Appointment updated successfully"));
});

export const getAppointmentStats = asyncHandler(async (req:Request,res:Response) => {
  const tenantId = req.user?.tenantId;
  const userId = req.user?.id;
  if (!tenantId || !userId) throw new ApiError(401, "Authenticated tenant context is required");

  const parsed = appointmentStatsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new ApiError(
      400,
      "Invalid appointment stats date range",
      parsed.error.issues.map(({ path, message }) => ({ path: path.join("."), message })),
    );
  }

  const doctor = await db.doctorProfile.findFirst({
    where: { userId, tenantId, isActive: true },
    select: { id: true },
  });
  if (!doctor) throw new ApiError(403, "An active doctor profile is required to view these stats");

  const where = {
    tenantId,
    doctorId: doctor.id,
    scheduledAt: { gte: parsed.data.from, lte: parsed.data.to },
  };

  const [appointments, statusCounts, uniquePatients] = await Promise.all([
    db.appointment.findMany({
      where,
      include: appointmentInclude,
      orderBy: { scheduledAt: "asc" },
    }),
    db.appointment.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    }),
    db.appointment.findMany({
      where,
      select: { patientId: true },
      distinct: ["patientId"],
    }),
  ]);

  const byStatus = statusCounts.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = row._count._all;
    return acc;
  }, {});
  const total = Object.values(byStatus).reduce((sum, count) => sum + count, 0);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        appointments,
        counts: {
          total,
          uniquePatients: uniquePatients.length,
          booked: byStatus.booked ?? 0,
          completed: byStatus.completed ?? 0,
          cancelled: byStatus.cancelled ?? 0,
          no_show: byStatus.no_show ?? 0,
          byStatus,
        }
      },
      "Appointment stats fetched successfully!"
    )
  )
})
