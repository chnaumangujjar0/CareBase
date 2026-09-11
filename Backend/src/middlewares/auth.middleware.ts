import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/apiError";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string };
    }
  }
}

const getAccessToken = (req: Request): string | undefined => {
  const authorization = req.headers.authorization;
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice(7).trim();
  }

  return req.cookies?.accessToken;
};

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  const token = getAccessToken(req);
  const secret = process.env.ACCESS_TOKEN_SECRET;

  if (!token || !secret) {
    return next(new ApiError(401, "Authentication required"));
  }

  try {
    const payload = jwt.verify(token, secret);
    if (typeof payload === "string" || typeof payload.id !== "string") {
      return next(new ApiError(401, "Invalid access token"));
    }

    req.user = { id: payload.id };
    return next();
  } catch {
    return next(new ApiError(401, "Invalid or expired access token"));
  }
};