import type { Request } from "express";
import { db } from "../db/index.js";
import type { Prisma } from "../generated/prisma/index.js";
import { getRequestMeta } from "./device.utils.js";

interface AuditLogInput {
  action: string;
  entityType: string;
  entityId?: string | null;
  tenantId?: string | null;
  userId?: string | null;
  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
}

export const getAuditRequestMetadata = (req: Request) => {
  return getRequestMeta(req);
};

export const writeAuditLog = (req: Request, input: AuditLogInput) => {
  const { ipAddress, userAgent } = getAuditRequestMetadata(req);
  return db.auditLog.create({
    data: {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      tenantId: input.tenantId !== undefined ? input.tenantId : req.user?.tenantId ?? null,
      userId: input.userId !== undefined ? input.userId : req.user?.id ?? null,
      ipAddress,
      userAgent,
      ...(input.oldValue !== undefined ? { oldValue: input.oldValue } : {}),
      ...(input.newValue !== undefined ? { newValue: input.newValue } : {}),
    },
  });
};
