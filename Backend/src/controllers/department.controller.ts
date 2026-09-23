import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { db } from "../db";
import { Char36 } from "../types/tenant.types";
import { ApiResponse } from "../utils/apiResponse";
import { z } from "zod";

export const addDepartment = asyncHandler(async(req:Request,res:Response) => {
    const {name, isActive = true} = req.body

    if(!name.trim()){
        throw new ApiError(400,"Department name is required!")
    }

    const dep = await db.orm.public.Department.create({name:name.trim(),tenantId:req.user?.tenantId as Char36,isActive})

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
    const {tenantId} = req.params
    const departments = await db.orm.public.Department.where({tenantId:tenantId as Char36}).all()
    return res.status(200).json(
        new ApiResponse(
            200,
            departments,
            "fetched successfully"
        )
    )
})


const updateDepartmentSchema = z.object({
    departmentId: z.string().min(1, "Department id is required"),
    name: z.string().trim().min(1, "Name cannot be empty").max(150).optional(),
    isActive: z.boolean().optional(),
  }).refine((data) => data.name !== undefined || data.isActive !== undefined, {
    message: "At least one field (name or isActive) is required to update.",
  });
 
interface DepartmentUpdatePayload {
  name?: string;
  isActive?: boolean;
}
 
export const updateDepartment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.tenantId) {
    throw new ApiError(401, "Authentication required");
  }
 
  const parsed = updateDepartmentSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid request body");
  }
  const { departmentId, name, isActive } = parsed.data;
 
  const tenantId = req.user.tenantId as Char36
  const deptId = departmentId as Char36;
 
  const department = await db.orm.public.Department.where({
    id: deptId,
    tenantId,
  }).first();
 
  if (!department) {
    throw new ApiError(404, "Department not found");
  }
 
  const payload: DepartmentUpdatePayload = {};
 
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
 console.log(payload);
  const updated = await db.orm.public.Department.where({
    id: deptId,
    tenantId,
  }).update(payload);
 
  return res
    .status(200)
    .json(new ApiResponse(200, updated, "Department updated successfully!"));
});

export const deleteDepartment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.tenantId) {
    throw new ApiError(401, "Authentication required");
  }
 
  const { departmentId } = req.body;
  if (!departmentId) {
    throw new ApiError(400, "Department id is required");
  }
 
  const tenantId = req.user.tenantId as Char36
  const deptId = departmentId as Char36
 
  const department = await db.orm.public.Department.where({
    id: deptId,
    tenantId,
  }).first();
 
  if (!department) {
    throw new ApiError(404, "Department not found");
  }
 

  const [doctorCount, appointmentCount] = await Promise.all([
    db.orm.public.DoctorProfile.where({ departmentId: deptId, tenantId }).count(),
    db.orm.public.Appointment.where({ departmentId: deptId, tenantId }).count(),
  ]);
 
  if (Number(doctorCount) > 0 || Number(appointmentCount) > 0) {
    throw new ApiError(
      409,
      "Cannot delete a department that still has doctors or appointments assigned to it. Reassign or remove them first."
    );
  }
 
  await db.orm.public.Department.where({ id: deptId, tenantId }).delete();
 
  return res
    .status(200)
    .json(new ApiResponse(200, { id: deptId }, "Department deleted successfully!"));
});