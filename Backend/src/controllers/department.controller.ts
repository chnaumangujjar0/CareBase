import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { db } from "../db/index.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { char36Schema } from "../types/tenant.types.js";
import type { Prisma } from "../generated/prisma/client.js";
import { z } from "zod";

const createDepartmentSchema = z.object({
  name: z.string().trim().min(1, "Department name is required"),
  isActive: z.boolean().default(true),
});

export const addDepartment = asyncHandler(async(req:Request,res:Response) => {
    const parsed = createDepartmentSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid department details");
    }
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
        throw new ApiError(401, "Authenticated tenant context is required");
    }

    const dep = await db.department.create({
      data: { ...parsed.data, tenantId },
    });

    if(!dep){
        throw new ApiError(400,"Error while creating this department.")
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            dep,
            "Department created successfully!"
        )
    )
})

export const getAllDepartments = asyncHandler(async (req:Request,res:Response) => {
    const rawTenantId = Array.isArray(req.params.tenantId)
      ? req.params.tenantId[0]
      : req.params.tenantId;
    const parsedTenantId = char36Schema.safeParse(rawTenantId);
    if (!parsedTenantId.success) {
      throw new ApiError(400, "A valid tenant id is required");
    }
    const tenantId = parsedTenantId.data;
    const departments = await db.department.findMany({ where: { tenantId } });
    return res.status(200).json(
        new ApiResponse(
            200,
            departments,
            "fetched successfully"
        )
    )
})


const updateDepartmentSchema = z.object({
    departmentId: char36Schema,
    name: z.string().trim().min(1, "Name cannot be empty").max(150).optional(),
    isActive: z.boolean().optional(),
  }).refine((data) => data.name !== undefined || data.isActive !== undefined, {
    message: "At least one field (name or isActive) is required to update.",
  });
 
export const updateDepartment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.tenantId) {
    throw new ApiError(401, "Authentication required");
  }
 
  const parsed = updateDepartmentSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid request body");
  }
  const { departmentId, name, isActive } = parsed.data;
 
  const tenantId = req.user.tenantId;
  const deptId = departmentId;
 
  const department = await db.department.findFirst({ where: { id: deptId, tenantId } });
 
  if (!department) {
    throw new ApiError(404, "Department not found");
  }
 
  const payload: Prisma.DepartmentUpdateInput = {};
 
  if (name !== undefined) {
    if (department.name === name) {
      throw new ApiError(400, "Name is unchanged; nothing to update.");
    }
    payload.name = name;
  }
 
  if (isActive !== undefined) {
    if (department.isActive === isActive) {
      throw new ApiError(400, "Status is unchanged; nothing to update.");
    }
    payload.isActive = isActive;
  }
  const updated = await db.department.update({
    where: { id: deptId, tenantId },
    data: payload,
  });
 
  return res
    .status(200)
    .json(new ApiResponse(200, updated, "Department updated successfully!"));
});

export const deleteDepartment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.tenantId) {
    throw new ApiError(401, "Authentication required");
  }
 
  const parsed = z.object({ departmentId: char36Schema }).safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, "A valid department id is required");
  }
  const { departmentId } = parsed.data;
 
  const tenantId = req.user.tenantId;
  const deptId = departmentId;
 
  const department = await db.department.findFirst({ where: { id: deptId, tenantId } });
 
  if (!department) {
    throw new ApiError(404, "Department not found");
  }
 

  const [doctorCount, appointmentCount] = await Promise.all([
    db.doctorProfile.count({ where: { departmentId: deptId, tenantId } }),
    db.appointment.count({ where: { departmentId: deptId, tenantId } }),
  ]);
 
  if (doctorCount > 0 || appointmentCount > 0) {
    throw new ApiError(
      409,
      "Cannot delete a department that still has doctors or appointments assigned to it. Reassign or remove them first."
    );
  }
 
  await db.department.delete({ where: { id: deptId, tenantId } });
 
  return res
    .status(200)
    .json(new ApiResponse(200, { id: deptId }, "Department deleted successfully!"));
});