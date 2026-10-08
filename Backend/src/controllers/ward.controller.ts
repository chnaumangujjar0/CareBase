import type { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { ApiResponse } from "../utils/apiResponse";
import {
  buildPagination,
  idParamSchema,
  isForeignKeyViolation,
  isUniqueViolation,
  paginationSchema,
  parseOrThrow,
  uuidSchema,
} from "../utils/facility.utils";
import { db } from "../db";


const createWardSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Ward name must be at least 2 characters")
    .max(100, "Ward name is too long"),
  departmentId: uuidSchema.nullable().optional(),
});

const updateWardSchema = createWardSchema
  .partial()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Provide at least one field to update.",
  });

const listWardsQuerySchema = paginationSchema.extend({
  departmentId: uuidSchema.optional(),
  search: z.string().trim().min(1).max(100).optional(),
});

const assertDepartmentInTenant = async (departmentId: string, tenantId: string) => {
  const department = await db.department.findFirst({
    where: { id: departmentId, tenantId },
    select: { id: true },
  });
  if (!department) {
    throw new ApiError(404, "Department not found.");
  }
};

export const createWard = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId as string;
  const { name, departmentId } = parseOrThrow(createWardSchema, req.body);

  if (departmentId) {
    await assertDepartmentInTenant(departmentId, tenantId);
  }

  try {
    const ward = await db.ward.create({
      data: { name, tenantId, departmentId: departmentId ?? null },
    });
    return res
      .status(201)
      .json(new ApiResponse(201, ward, "Ward created successfully."));
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ApiError(409, "A ward with this name already exists.");
    }
    throw error;
  }
});

export const listWards = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId as string;
  const { page, limit, departmentId, search } = parseOrThrow(
    listWardsQuerySchema,
    req.query
  );

  const where = {
    tenantId,
    ...(departmentId ? { departmentId } : {}),
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const [items, total] = await Promise.all([
    db.ward.findMany({
      where,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        Department: { select: { id: true, name: true } },
        _count: { select: { Room: true } },
      },
    }),
    db.ward.count({ where }),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      { items, pagination: buildPagination(page, limit, total) },
      "Wards fetched successfully."
    )
  );
});

export const getWard = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId as string;
  const { id } = parseOrThrow(idParamSchema, req.params);

  const ward = await db.ward.findFirst({
    where: { id, tenantId },
    include: {
      Department: true,
      Room: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, _count: { select: { Bed: true } } },
      },
    },
  });

  // A ward in another tenant is indistinguishable from one that doesn't
  // exist - deliberately, so ids can't be probed across hospitals.
  if (!ward) {
    throw new ApiError(404, "Ward not found.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, ward, "Ward fetched successfully."));
});

export const updateWard = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId as string;
  const { id } = parseOrThrow(idParamSchema, req.params);
  const data = parseOrThrow(updateWardSchema, req.body);

  if (data.departmentId) {
    await assertDepartmentInTenant(data.departmentId, tenantId);
  }

  try {
   
    const { count } = await db.ward.updateMany({
      where: { id, tenantId },
      data,
    });

    if (count === 0) {
      throw new ApiError(404, "Ward not found.");
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ApiError(409, "A ward with this name already exists.");
    }
    throw error;
  }

  const ward = await db.ward.findFirst({ where: { id, tenantId } });
  return res
    .status(200)
    .json(new ApiResponse(200, ward, "Ward updated successfully."));
});

export const deleteWard = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId as string;
  const { id } = parseOrThrow(idParamSchema, req.params);

  const ward = await db.ward.findFirst({
    where: { id, tenantId },
    select: { id: true, _count: { select: { Room: true } } },
  });

  if (!ward) {
    throw new ApiError(404, "Ward not found.");
  }

  const roomCount = ward._count.Room;
  if (roomCount > 0) {
    throw new ApiError(
      409,
      `This ward still has ${roomCount} room${roomCount === 1 ? "" : "s"}. ` +
        "Move them to another ward or delete them first, then try again."
    );
  }

  try {
    await db.ward.deleteMany({ where: { id, tenantId } });
  } catch (error) {
    // With Room.Ward set to onDelete: Restrict, this also catches a room
    // created in the instant between the check above and this delete.
    // (It also covers StaffProfile rows, if their FK restricts deletion.)
    if (isForeignKeyViolation(error)) {
      throw new ApiError(
        409,
        "This ward is still referenced by other records (rooms or assigned staff) and can't be deleted."
      );
    }
    throw error;
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Ward deleted successfully."));
});