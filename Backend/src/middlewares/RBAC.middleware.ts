import type { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { db } from "../db";
import { ApiError } from "../utils/apiError";
import { Char36 } from "../types/tenant.types";
import { Role } from "../types/user.types";


export const checkEligibilty = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ApiError(401, "Authentication required");
    }

    const { tenantId } = req.params;
    if (!tenantId || typeof tenantId !== "string") {
      throw new ApiError(400, "tenantId is required");
    }

    if (req.user.tenantId !== tenantId) {
      throw new ApiError(401, "Unauthorized");
    }

    if (!req.user.roleId) {
      throw new ApiError(403, "No role assigned for this tenant");
    }

    const role = await db.orm.public.Role.where({
      id: req.user.roleId as Char36,
      tenantId: tenantId as Char36,
    }).first();

    if (!role) {
      throw new ApiError(403, "You do not have access to this tenant");
    }
    req.role = role as Role
    next();
  }
);

