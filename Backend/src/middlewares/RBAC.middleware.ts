import type { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { db } from "../db/index.js";
import { ApiError } from "../utils/apiError.js";
import { char36Schema } from "../types/tenant.types.js";
import { getEffectiveRolePermissions } from "../constants/roles.js";


const SUPER_AUTHORIZED_ROLES: Array<string> = ["Owner", "Admin"];

export const checkEligibilty = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ApiError(401, "Authentication required");
    }

    const routeTenantId = Array.isArray(req.params.tenantId)
      ? req.params.tenantId[0]
      : req.params.tenantId;
    const rawTenantId = routeTenantId ?? req.user.tenantId;
    const parsedTenantId = char36Schema.safeParse(rawTenantId);
    if (!parsedTenantId.success) {
      throw new ApiError(403, "A valid tenant context is required");
    }
    const tenantId = parsedTenantId.data;

    if (req.user.tenantId !== tenantId) {
      throw new ApiError(401, "Unauthorized");
    }

    if (!req.user.roleId) {
      throw new ApiError(403, "No role assigned for this tenant");
    }

    const role = await db.role.findFirst({
      where: { id: req.user.roleId, tenantId },
    });

    if (!role) {
      throw new ApiError(403, "You do not have access to this tenant");
    }
    if (!req.user.Tenant || req.user.Tenant.approvalStatus !== "approved") {
      throw new ApiError(403, "This hospital is awaiting CareBase approval.");
    }
    req.role = role
    next();
  }
);

export const requirePlatformSuperAdmin = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user?.isSuperAdmin) throw new ApiError(403, "Platform super administrator access is required.");
    next();
  },
);

export const checkAuthorizationForSuperRoles = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.role) {
      throw new ApiError(403, "Role not resolved for this request");
    }
 
    const isAuthorized = SUPER_AUTHORIZED_ROLES.includes(req.role.name);
    
    if (!isAuthorized) {
      throw new ApiError(403, "You are unauthorized to perform this task");
    }
 
    next();
  }
);

export const requirePermissions = (...requiredPermissions: string[]) =>
  asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.role) {
      throw new ApiError(403, "Role not resolved for this request");
    }

    const permissions = getEffectiveRolePermissions(req.role.name, req.role.permissions);

    const hasWildcard =
      Array.isArray(permissions) && permissions.some((permission) => permission === "*");
    const hasAllRequired =
      hasWildcard ||
      (Array.isArray(permissions) &&
        requiredPermissions.every((required) => permissions.includes(required)));

    if (!hasAllRequired) {
      throw new ApiError(403, "You do not have permission to perform this clinical action.");
    }

    next();
  });
