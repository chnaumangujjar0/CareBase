import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { db } from "../db/index.js";
import bcrypt from "bcrypt";
import { z } from "zod";

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
  role: z.string().trim().min(1, "Role is required").max(64)
});

export const createProfileSchema = z.discriminatedUnion("type", [
  doctorSchema,
  staffSchema,
]);

const BCRYPT_ROUNDS = 12;



export const addStaff = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    throw new ApiError(401, "Authenticated tenant context is required");
  }
  const tenant = tenantId;
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
        trx.department.findFirst({ where: { id: input.departmentId, tenantId: tenant } }),
        trx.user.findUnique({ where: { email: input.email } }),
        trx.staffProfile.findFirst({ where: { tenantId: tenant, employeeId: normalizedEmployeeId } }),
        trx.doctorProfile.findFirst({ where: { tenantId: tenant, employeeId: normalizedEmployeeId } }),
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
          where: { id: input.wardId, tenantId: tenant, departmentId: input.departmentId },
        });
        if (!ward) {
          throw new ApiError(400, "Ward must belong to the selected department and tenant");
        }
      }

      const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
      const roleName = input.type === "Doctor" ? "Doctor" : input.role;
      const role =
        (await trx.role.findFirst({ where: { tenantId: tenant, name: roleName } })) ??
        (await trx.role.create({ data: { tenantId: tenant, name: roleName, permissions: [] } }));

      const user = await trx.user.create({
        data: {
          tenantId: tenant,
          roleId: role.id,
          isSuperAdmin: false,
          name: input.name,
          email: input.email,
          passwordHash,
          isActive: input.isActive,
        },
      });

      const profile =
        input.type === "Doctor"
          ? await trx.doctorProfile.create({
              data: {
                tenantId: tenant,
                userId: user.id,
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
                tenantId: tenant,
                userId: user.id,
                employeeId: normalizedEmployeeId,
                departmentId: input.departmentId,
                wardId: input.wardId ?? null,
                shift: input.shift ?? null,
                joiningDate: input.joiningDate ?? null,
                phone: input.phone,
                isActive: input.isActive,
              },
            });

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          tenantId,
          roleId: role.id,
          isActive: user.isActive,
        },
        role,
        profile,
      };
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
