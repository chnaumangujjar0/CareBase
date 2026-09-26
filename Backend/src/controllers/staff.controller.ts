import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { ApiResponse } from "../utils/apiResponse";
import { db } from "../prisma/db";
import bcrypt from "bcrypt";
import type { Char } from "@prisma/orm-postgres/target/codec-types";
import { z } from "zod";
import { Char36 } from "../types/tenant.types";

const optionalText = (maxLength: number) =>
  z.string().trim().max(maxLength).nullish().transform((value) => value || null);

const baseProfileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  email: z.email().trim().toLowerCase(),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(72, "Password must be no more than 72 characters")
    .refine((password) => Buffer.byteLength(password, "utf8") <= 72, {
      message: "Password must be no more than 72 bytes",
    }),
  employeeId: z.string().trim().min(1, "Employee ID is required").max(64),
  departmentId: z.uuid("Invalid department ID"),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a valid phone number")
    .max(20, "Phone number is too long")
    .refine((phone) => {
      const digits = phone.replace(/\D/g, "");
      return digits.length >= 7 && digits.length <= 15;
    }, "Enter a valid phone number"),
  isActive: z.boolean().default(true),
});

const doctorSchema = baseProfileSchema.extend({
  type: z.literal("Doctor"),
  specialization: z.string().trim().min(1, "Specialization is required").max(120),
  licenseNumber: z.string().trim().min(1, "License number is required").max(100),
  qualifications: optionalText(500),
  description: optionalText(2000),
  designation: optionalText(120),
});

const staffSchema = baseProfileSchema.extend({
  type: z.literal("Staff"),
  wardId: z.uuid("Invalid ward ID").nullish(),
  shift: z.enum(["Morning", "Evening", "Night"]).nullish(),
  joiningDate: z.coerce.date().nullish(),
  description: optionalText(2000),
  designation: optionalText(120),
});

export const createProfileSchema = z.discriminatedUnion("type", [
  doctorSchema,
  staffSchema,
]);

const BCRYPT_ROUNDS = 12;

type AuthenticatedRequest = Request & {
  user?: Request["user"] & { tenantId?: Char36 | null };
};

export const addStaff = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = (req as AuthenticatedRequest).user?.tenantId;
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
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  try {
    const result = await db.transaction(async (trx) => {
      const [department, existingUser, existingStaff, existingDoctor] = await Promise.all([
        trx.orm.public.Department.where({ id: input.departmentId as Char36, tenantId: tenantId as Char36 }).first(),
        trx.orm.public.User.where({ email: input.email }).first(),
        trx.orm.public.StaffProfile.where({ tenantId, employeeId: normalizedEmployeeId }).first(),
        trx.orm.public.DoctorProfile.where({ tenantId, employeeId: normalizedEmployeeId }).first(),
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
        const ward = await trx.orm.public.Ward.where({
          id: input.wardId as Char36,
          tenantId,
          departmentId: input.departmentId as Char36,
        }).first();
        if (!ward) {
          throw new ApiError(400, "Ward must belong to the selected department and tenant");
        }
      }

      const user = await trx.orm.public.User.create({
        tenantId,
        roleId: null,
        isSuperAdmin: false,
        name: input.name,
        email: input.email,
        passwordHash,
        isActive: input.isActive,
      });

      const role = await trx.orm.public.Role.create({
        tenantId,
        name: `${}`,
        permissions: [],
      });

      await trx.orm.public.User.where({ id: user.id, tenantId }).update({
        roleId: role.id,
      });

      const profile = input.type === "Doctor"
        ? await trx.orm.public.DoctorProfile.create({
            tenantId,
            userId: user.id,
            departmentId: input.departmentId as Char36,
            employeeId: normalizedEmployeeId,
            specialization: input.specialization,
            qualifications: input.qualifications,
            licenseNumber: input.licenseNumber,
            description: input.description,
            designation: input.designation,
            phone: input.phone,
            isActive: input.isActive,
          })
        : await trx.orm.public.StaffProfile.create({
          tenantId: tenantId as Char<36>,
            userId: user.id,
            employeeId: normalizedEmployeeId,
          departmentId: input.departmentId as Char<36>,
          wardId: input.wardId ? input.wardId as Char<36> : null,
            shift: input.shift ?? null,
            joiningDate: input.joiningDate ?? null,
            phone: input.phone,
            isActive: input.isActive,
          });

      return { user: { id: user.id, name: user.name, email: user.email, tenantId, roleId: role.id, isActive: user.isActive }, role, profile };
    });

    return res.status(201).json(
      new ApiResponse(201, { ...result, type: input.type }, `${input.type} created successfully`)
    );
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      throw new ApiError(409, "A user, role, or employee ID already exists");
    }
    throw error;
  }
});
