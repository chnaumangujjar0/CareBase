import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler"; 
import { ApiError } from "../utils/apiError";
import { db } from "../prisma/db"; 

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  tenantId: string | null;
  roleId: string | null;
  isSuperAdmin: boolean;
  isActive: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

interface AccessTokenPayload {
  id: string;
}

type Char36 = string & { readonly __charLength: 36 };

const isAccessTokenPayload = (value: unknown): value is AccessTokenPayload =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as Record<string, unknown>).id === "string";

const getAccessToken = (req: Request): string | undefined => {
  const authorization = req.headers.authorization;
  if (authorization && /^Bearer\s+/i.test(authorization)) {
    return authorization.replace(/^Bearer\s+/i, "").trim();
  }

  return req.cookies?.accessToken;
};

export const requireAuth = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = getAccessToken(req);

    if (!token) {
      throw new ApiError(401, "Authentication required");
    }

    const secret = process.env.ACCESS_TOKEN_SECRET;
    if (!secret) {
      throw new ApiError(500, "Server misconfiguration: ACCESS_TOKEN_SECRET is not set.");
    }

    let payload: unknown;
    try {
      payload = jwt.verify(token, secret);
    } catch {
      throw new ApiError(401, "Invalid or expired access token");
    }

    if (!isAccessTokenPayload(payload)) {
      throw new ApiError(401, "Invalid access token");
    }

    const user = await db.orm.public.User.where({
      id: payload.id as Char36,
    })
      .select("id", "email", "name", "tenantId", "roleId", "isSuperAdmin", "isActive")
      .first();

    if (!user) {
      throw new ApiError(401, "Invalid access token");
    }

    if (!user.isActive) {
      throw new ApiError(403, "This account has been deactivated.");
    }

    req.user = user;
    next();
  }
);