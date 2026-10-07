import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { z } from "zod";
import { ApiError } from "../utils/apiError.js";
import { db } from "../db/index.js";
import { ApiResponse } from "../utils/apiResponse.js";

const createRoleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Role name must be at least 2 characters")
    .max(60, "Role name must be under 60 characters"),
  permissions: z.array(z.string().min(1)).default([]),
});
 
const updateRoleSchema = z.object({
    name: z.string().trim().min(2, "Role name must be at least 2 characters").max(60).optional(),
    permissions: z.array(z.string().min(1)).optional(),
  })
  .refine((data) => data.name !== undefined || data.permissions !== undefined, {
    message: "At least one field (name or permissions) is required to update.",
  });

const roleIdSchema = z.uuid();

interface RoleRecord {
  id: string;
  name: string;
  permissions: unknown;
  createdAt: Date;
  updatedAt: Date;
  _count?: { User: number };
}

function serializeRole(role: RoleRecord) {
  return {
    id: role.id,
    name: role.name,
    permissions: Array.isArray(role.permissions) ? role.permissions : [],
    userCount: role._count?.User ?? 0,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
}

function serializeRoleListItem(role: RoleRecord, position: number) {
  return {
    ...serializeRole(role),
    code: `ROLE-${String(position + 1).padStart(2, "0")}`,
  };
}

export const createRole = asyncHandler(async (req:Request,res:Response) => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) throw new ApiError(401, "Authenticated tenant context is required");

  const parsed = createRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid role details");
  }
  const { name, permissions } = parsed.data;

  const role = await db.role.create({
    data: { tenantId, name, permissions },
  });

  return res
    .status(201)
    .json(new ApiResponse(201, serializeRole({ ...role, _count: { User: 0 } }), "Role created successfully"));
});

export const updateRole = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) throw new ApiError(401, "Authenticated tenant context is required");

  const parsedId = roleIdSchema.safeParse(req.params.roleId);
  if (!parsedId.success) throw new ApiError(400, "A valid role id is required");

  const parsed = updateRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid role details");
  }
  const { name, permissions } = parsed.data;

  const existing = await db.role.findFirst({ where: { id: parsedId.data, tenantId } });
  if (!existing) {
    throw new ApiError(404, "Role not found");
  }

  const updated = await db.role.update({
    where: { id: parsedId.data },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(permissions !== undefined ? { permissions } : {}),
    },
    include: { _count: { select: { User: true } } },
  });

  return res.status(200).json(new ApiResponse(200, serializeRole(updated), "Role updated successfully"));
});

export const getRoles = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) throw new ApiError(401, "Authenticated tenant context is required");

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 10));

  const [roles, total] = await db.$transaction([
    db.role.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { User: true } } },
    }),
    db.role.count({ where: { tenantId } }),
  ]);

  const data = roles.map((role, idx) => serializeRoleListItem(role, (page - 1) * limit + idx));

  return res.status(200).json(
    new ApiResponse(
      200,
      { roles: data, page, limit, total, showingFrom: total === 0 ? 0 : (page - 1) * limit + 1, showingTo: Math.min(page * limit, total) },
      "Roles fetched successfully"
    )
  );
});

export const deleteRole = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) throw new ApiError(401, "Authenticated tenant context is required");

  const parsedId = roleIdSchema.safeParse(req.params.roleId);
  if (!parsedId.success) throw new ApiError(400, "A valid role id is required");

  const role = await db.role.findFirst({
    where: { id: parsedId.data, tenantId },
    include: { _count: { select: { User: true } } },
  });

  if (!role) {
    throw new ApiError(404, "Role not found");
  }

  if (role._count.User > 0) {
    throw new ApiError(
      409,
      `Cannot delete a role with ${role._count.User} assigned staff. Reassign them to a different role first.`
    );
  }

  await db.role.delete({ where: { id: parsedId.data } });

  return res.status(200).json(new ApiResponse(200, { id: parsedId.data }, "Role deleted successfully"));
});
 