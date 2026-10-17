import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { db } from "../db/index.js";
import bcrypt from "bcrypt";
import { z } from "zod";
import { char36Schema } from "../types/tenant.types.js";
import { writeAuditLog } from "../utils/audit.utils.js";
import { STANDARD_ROLE_NAMES, type StandardRoleName } from "../constants/roles.js";

const optionalText = (maxLength: number) =>
  z.string().trim().max(maxLength).nullish().transform((value) => value || null);

const availabilitySlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startMinute: z.number().int().min(0).max(1439),
  endMinute: z.number().int().min(1).max(1440),
}).refine((slot) => slot.endMinute > slot.startMinute, {
  message: "End time must be later than start time",
  path: ["endMinute"],
});

const availabilitySchema = z.array(availabilitySlotSchema).max(7).default([]).superRefine((slots, context) => {
  const seenDays = new Set<number>();
  slots.forEach((slot, index) => {
    if (seenDays.has(slot.dayOfWeek)) {
      context.addIssue({
        code: "custom",
        message: "Only one availability window is allowed per day",
        path: [index, "dayOfWeek"],
      });
    }
    seenDays.add(slot.dayOfWeek);
  });
});

const employmentProfileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  employeeId: z.string().trim().min(1, "Employee ID is required").max(64),
  departmentId: z.uuid("Invalid department ID"),
  phone: optionalText(20),
  isActive: z.boolean().default(true),
  availability: availabilitySchema,
});

const accountCredentialsSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(72, "Password must be no more than 72 characters")
    .refine((password) => Buffer.byteLength(password, "utf8") <= 72, {
      message: "Password must be no more than 72 bytes",
    }),
});

const requiredPhoneSchema = z.string()
  .trim()
  .min(7, "Enter a valid phone number")
  .max(20, "Phone number is too long")
  .refine((phone) => {
    const digits = phone.replace(/\D/g, "");
    return digits.length >= 7 && digits.length <= 15;
  }, "Enter a valid phone number");

const doctorSchema = employmentProfileSchema.extend({
  type: z.literal("Doctor"),
  phone: requiredPhoneSchema,
}).merge(accountCredentialsSchema).extend({
  specialization: z.string().trim().min(1, "Specialization is required").max(120),
  licenseNumber: z.string().trim().min(1, "License number is required").max(100),
  qualifications: optionalText(500),
  description: optionalText(2000),
  designation: optionalText(120),
});

const staffBaseSchema = employmentProfileSchema.extend({
  type: z.literal("Staff"),
  wardId: z.uuid("Invalid ward ID").nullish(),
  joiningDate: z.coerce.date().nullish(),
  description: optionalText(2000),
  designation: optionalText(120),
});

const staffSchema = z.discriminatedUnion("hasSystemAccess", [
  staffBaseSchema.extend({ hasSystemAccess: z.literal(true) }).merge(accountCredentialsSchema).extend({
    role: z.enum(STANDARD_ROLE_NAMES as [StandardRoleName, ...StandardRoleName[]]),
  }),
  staffBaseSchema.extend({
    hasSystemAccess: z.literal(false),
    designation: z.string().trim().min(1, "Designation is required").max(120),
  }),
]);

export const createProfileSchema = z.union([doctorSchema, staffSchema]);

const BCRYPT_ROUNDS = 12;



export const addStaff = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    throw new ApiError(401, "Authenticated tenant context is required");
  }
  const parsed = createProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(
      400,
      "Invalid staff details",
      parsed.error.issues.map(({ path, message }) => ({ path: path.join("."), message }))
    );
  }

  const input = parsed.data;
  const normalizedEmployeeId = input.employeeId.trim();

  try {
    const result = await db.$transaction(async (trx) => {
      const [department, existingUser, existingStaff, existingDoctor] = await Promise.all([
        trx.department.findFirst({ where: { id: input.departmentId, tenantId } }),
        "email" in input ? trx.user.findUnique({ where: { email: input.email } }) : null,
        trx.staffProfile.findFirst({ where: { tenantId, employeeId: normalizedEmployeeId } }),
        trx.doctorProfile.findFirst({ where: { tenantId, employeeId: normalizedEmployeeId } }),
      ]);

      if (!department || !department.isActive) {
        throw new ApiError(400, "An active department in this tenant is required");
      }
      if (existingUser) {
        throw new ApiError(409, "A user with this email already exists");
      }
      if (existingStaff || existingDoctor) {
        throw new ApiError(409, "This employee ID is already in use in this tenant");
      }

      if (input.type === "Staff" && input.wardId) {
        const ward = await trx.ward.findFirst({
          where: { id: input.wardId, tenantId, departmentId: input.departmentId },
        });
        if (!ward) {
          throw new ApiError(400, "Ward must belong to the selected department and tenant");
        }
      }

      const credentials = "password" in input ? input : null;
      const hasSystemAccess = credentials !== null;
      const roleName = input.type === "Doctor" ? "Doctor" : "role" in input ? input.role : null;
      const role = roleName ? await trx.role.findFirst({ where: { tenantId, name: roleName } }) : null;
      if (roleName && !role) {
        throw new ApiError(400, `The ${roleName} role is not configured for this tenant. Create the standard role before adding staff.`);
      }

      const user = hasSystemAccess
        ? await trx.user.create({
            data: {
              tenantId,
              roleId: role!.id,
              isSuperAdmin: false,
              name: input.name,
              email: credentials!.email,
              passwordHash: await bcrypt.hash(credentials!.password, BCRYPT_ROUNDS),
              isActive: input.isActive,
            },
          })
        : null;

      const profile =
        input.type === "Doctor"
          ? await trx.doctorProfile.create({
              data: {
                tenantId,
                userId: user!.id,
                departmentId: input.departmentId,
                employeeId: normalizedEmployeeId,
                specialization: input.specialization,
                qualifications: input.qualifications,
                licenseNumber: input.licenseNumber,
                description: input.description,
                designation: input.designation,
                phone: input.phone,
                isActive: input.isActive,
              },
            })
          : await trx.staffProfile.create({
              data: {
                tenantId,
                userId: user?.id ?? null,
                name: input.name,
                email: "email" in input ? input.email : null,
                employeeId: normalizedEmployeeId,
                departmentId: input.departmentId,
                wardId: input.wardId ?? null,
                joiningDate: input.joiningDate ?? null,
                phone: input.phone,
                isActive: input.isActive,
                designation: input.designation,
                description: input.description,
              },
            });

      if (input.availability.length > 0) {
        if (input.type === "Doctor") {
          await trx.doctorAvailability.createMany({
            data: input.availability.map((slot) => ({
              ...slot,
              tenantId,
              doctorId: profile.id,
            })),
          });
        } else {
          await trx.staffAvailability.createMany({
            data: input.availability.map((slot) => ({
              ...slot,
              tenantId,
              staffId: profile.id,
            })),
          });
        }
      }

      return {
        user: user ? {
          id: user.id,
          name: user.name,
          email: user.email,
          tenantId,
          roleId: role!.id,
          isActive: user.isActive,
        } : null,
        role,
        profile,
        availability: input.availability.map((slot) => ({ ...slot, isActive: true })),
      };
    });

    await writeAuditLog(req, {
      action: "create",
      entityType: input.type === "Doctor" ? "DoctorProfile" : "StaffProfile",
      entityId: result.profile.id,
      newValue: {
        userId: result.user?.id ?? null,
        name: input.name,
        email: result.user?.email ?? null,
        role: result.role?.name ?? (input.type === "Staff" ? input.designation : "Doctor"),
        employeeId: normalizedEmployeeId,
        departmentId: input.departmentId,
        isActive: input.isActive,
        availabilityCount: input.availability.length,
      },
    });
    return res
      .status(201)
      .json(new ApiResponse(201, { ...result, type: input.type }, `${input.type} created successfully`));
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      throw new ApiError(409, "A user, role, or employee ID already exists");
    }
    throw error;
  }
});

export const getAllStaff = asyncHandler(async (req: Request, res: Response) => {
  const rawTenantId = req.user?.tenantId;
  const parsedTenantId = char36Schema.safeParse(rawTenantId);

  if (!parsedTenantId.success) {
    throw new ApiError(400, "A valid tenant id is required");
  }

  const tenantId = parsedTenantId.data;
  const [doctors, staff] = await Promise.all([
    db.doctorProfile.findMany({
      where: { tenantId },
      include: {
        User: { select: { id: true, name: true, email: true } },
        DoctorAvailability: {
          where: { isActive: true },
          orderBy: { dayOfWeek: "asc" },
        },
      },
    }),
    db.staffProfile.findMany({
      where: { tenantId },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            Role: { select: { name: true } },
          },
        },
        StaffAvailability: {
          where: { isActive: true },
          orderBy: { dayOfWeek: "asc" },
        },
      },
    }),
  ]);

  const directory = [
    ...doctors.map((doctor) => ({
      id: doctor.id,
      userId: doctor.User.id,
      name: doctor.User.name,
      email: doctor.User.email,
      phone: doctor.phone,
      role: doctor.designation || doctor.specialization,
      type: "Doctor" as const,
      bio: doctor.description || doctor.specialization,
      availability: doctor.DoctorAvailability,
    })),
    ...staff.map((member) => ({
      id: member.id,
      userId: member.User?.id ?? null,
      hasSystemAccess: member.userId !== null,
      name: member.User?.name ?? member.name,
      email: member.User?.email ?? member.email ?? "",
      phone: member.phone || "",
      role: member.designation || member.User?.Role?.name || "Staff",
      type: "Staff" as const,
      bio: member.description || member.designation || member.User?.Role?.name || "Hospital staff",
      availability: member.StaffAvailability,
    })),
  ].sort((left, right) => left.name.localeCompare(right.name));

  return res.status(200).json(new ApiResponse(200, directory, "Staff fetched successfully"));
});

const updateAvailabilitySchema = z.object({
  profileId: z.uuid("Invalid profile ID"),
  type: z.enum(["Doctor", "Staff"]),
  availability: availabilitySchema,
});

export const updateAvailability = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    throw new ApiError(401, "Authenticated tenant context is required");
  }

  const parsed = updateAvailabilitySchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(
      400,
      "Invalid availability",
      parsed.error.issues.map(({ path, message }) => ({ path: path.join("."), message })),
    );
  }

  const { profileId, type, availability } = parsed.data;
  const { oldAvailability, savedAvailability } = await db.$transaction(async (trx) => {
    if (type === "Doctor") {
      const doctor = await trx.doctorProfile.findFirst({ where: { id: profileId, tenantId } });
      if (!doctor) throw new ApiError(404, "Doctor profile not found");

      const oldAvailability = await trx.doctorAvailability.findMany({
        where: { doctorId: profileId, tenantId, isActive: true },
        select: { dayOfWeek: true, startMinute: true, endMinute: true },
      });
      await trx.doctorAvailability.deleteMany({ where: { doctorId: profileId, tenantId } });
      if (availability.length > 0) {
        await trx.doctorAvailability.createMany({
          data: availability.map((slot) => ({ ...slot, doctorId: profileId, tenantId })),
        });
      }
      const savedAvailability = await trx.doctorAvailability.findMany({
        where: { doctorId: profileId, tenantId, isActive: true },
        orderBy: { dayOfWeek: "asc" },
      });
      return { oldAvailability, savedAvailability };
    }

    const staffProfile = await trx.staffProfile.findFirst({ where: { id: profileId, tenantId } });
    if (!staffProfile) throw new ApiError(404, "Staff profile not found");

    const oldAvailability = await trx.staffAvailability.findMany({
      where: { staffId: profileId, tenantId, isActive: true },
      select: { dayOfWeek: true, startMinute: true, endMinute: true },
    });
    await trx.staffAvailability.deleteMany({ where: { staffId: profileId, tenantId } });
    if (availability.length > 0) {
      await trx.staffAvailability.createMany({
        data: availability.map((slot) => ({ ...slot, staffId: profileId, tenantId })),
      });
    }
    const savedAvailability = await trx.staffAvailability.findMany({
      where: { staffId: profileId, tenantId, isActive: true },
      orderBy: { dayOfWeek: "asc" },
    });
    return { oldAvailability, savedAvailability };
  });

  await writeAuditLog(req, {
    action: "update",
    entityType: type === "Doctor" ? "DoctorAvailability" : "StaffAvailability",
    entityId: profileId,
    oldValue: oldAvailability,
    newValue: savedAvailability.map(({ dayOfWeek, startMinute, endMinute }) => ({
      dayOfWeek,
      startMinute,
      endMinute,
    })),
  });
  return res.status(200).json(
    new ApiResponse(200, savedAvailability, "Availability updated successfully"),
  );
});
