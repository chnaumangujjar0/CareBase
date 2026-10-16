import type { Request, Response } from "express";
import { z } from "zod";
import { db } from "../db/index.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) throw new ApiError(401, "Authenticated tenant context is required.");

  const query = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(25),
    action: z.string().trim().max(100).optional(),
    entityType: z.string().trim().max(100).optional(),
  }).parse(req.query);

  const where = {
    tenantId,
    ...(query.action ? { action: { contains: query.action, mode: "insensitive" as const } } : {}),
    ...(query.entityType ? { entityType: { contains: query.entityType, mode: "insensitive" as const } } : {}),
  };
  const [items, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: { User: { select: { id: true, name: true, email: true } } },
    }),
    db.auditLog.count({ where }),
  ]);

  return res.status(200).json(new ApiResponse(200, {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  }, "Audit logs fetched successfully."));
});
