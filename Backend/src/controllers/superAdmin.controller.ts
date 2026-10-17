import type { Request, Response } from "express";
import { z } from "zod";
import { db } from "../db/index.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getAuditRequestMetadata } from "../utils/audit.utils.js";
import { parseParamUuid, parseRequest } from "../utils/request.utils.js";

export const listPlatformTenants = asyncHandler(async (_req: Request, res: Response) => {
  const tenants = await db.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      User: {
        where: { roleId: { not: null }, Role: { name: "Owner" } },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { id: true, name: true, email: true },
      },
      _count: { select: { User: true, Patient: true } },
    },
  });
  return res.status(200).json(new ApiResponse(200, tenants, "Hospitals fetched successfully."));
});

const approvalSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]),
  note: z.string().trim().max(2000).nullish(),
});

export const updatePlatformTenantApproval = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = parseParamUuid(req, "tenantId");
  const input = parseRequest(approvalSchema, req.body, "Invalid hospital approval decision.");
  if (input.status === "rejected" && !input.note?.trim()) {
    throw new ApiError(400, "Add a short reason when rejecting a hospital application.");
  }

  const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { id: true, approvalStatus: true } });
  if (!tenant) throw new ApiError(404, "Hospital application not found.");
  if (tenant.approvalStatus !== "pending" && input.status !== "pending") {
    throw new ApiError(409, "Only pending hospital applications can be approved or rejected.");
  }

  const updated = await db.tenant.update({
    where: { id: tenantId },
    data: {
      approvalStatus: input.status,
      approvalNote: input.status === "rejected" ? input.note!.trim() : null,
      approvalReviewedAt: input.status === "pending" ? null : new Date(),
    },
    select: { id: true, name: true, approvalStatus: true, approvalNote: true, approvalReviewedAt: true },
  });
  await db.auditLog.create({
    data: {
      action: input.status === "pending" ? "reopen" : input.status,
      entityType: "TenantApproval",
      entityId: tenantId,
      userId: req.user!.id,
      ...getAuditRequestMetadata(req),
      oldValue: { status: tenant.approvalStatus },
      newValue: { status: updated.approvalStatus, note: updated.approvalNote },
    },
  });
  return res.status(200).json(new ApiResponse(200, updated, `Hospital ${input.status === "pending" ? "returned to pending" : input.status}.`));
});
