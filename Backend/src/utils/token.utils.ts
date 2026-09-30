import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { ApiError } from "./apiError.js";
import { db } from "../db/index.js";
import { char36Schema } from "../types/tenant.types.js";
import type { RefreshTokenPayload, SessionResponse } from "../types/session.types.js";
const DEFAULT_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days fallback
const getRequiredEnv = (key: string) => {
  const value = process.env[key];
  if (!value) {
    throw new ApiError(500, `${key} is not configured`);
  }
  return value;
};

const parseExpiryToDate = (expiry?: string): Date => {
  const ms = expiry
    ? (() => {
        const value = Number(expiry.slice(0, -1));
        const unit = expiry.slice(-1).toLowerCase();

        const multipliers: Record<string, number> = {
          s: 1000,
          m: 60 * 1000,
          h: 60 * 60 * 1000,
          d: 24 * 60 * 60 * 1000,
        };

        return value * (multipliers[unit] ?? 0);
      })()
    : DEFAULT_SESSION_TTL_MS;

  return new Date(Date.now() + ms);
};


export const generateAccessAndRefreshToken = async (
  userId: string,
  meta: { userAgent?: string; ipAddress?: string  } = {}
) => {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, "User not found while generating tokens");
  }

  try {
    const accessSecret = getRequiredEnv("ACCESS_TOKEN_SECRET");
    const refreshSecret = getRequiredEnv("REFRESH_TOKEN_SECRET");
    const accessExpiry = process.env.ACCESS_TOKEN_EXPIRY || "15m";
    const refreshExpiry = process.env.REFRESH_TOKEN_EXPIRY || "30d";

    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      accessSecret,
      {
        expiresIn: accessExpiry as SignOptions["expiresIn"],
      }
    );

    const session = await db.session.create({
      data: {
        userId: user.id,
        tokenHash: randomUUID(),
        ipAddress: meta.ipAddress || null,
        userAgent: meta.userAgent || null,
        expiresAt: parseExpiryToDate(refreshExpiry),
      },
    });

    const refreshToken = jwt.sign(
      { _id: user.id, sid: session.id },
      refreshSecret,
      { expiresIn: refreshExpiry as SignOptions["expiresIn"] }
    );
    
    await db.session.update({
      where: { id: session.id },
      data: { tokenHash: refreshToken },
    });

    return { accessToken, refreshToken };
  } catch (error) {
    if(error instanceof Error){
      console.log(error.message);
    }
    throw new ApiError(500, "Something went wrong while generating tokens");
  }
};

export const verifySessionFromRefreshToken = async (incomingRefreshToken: string): Promise<SessionResponse> => {
  const decoded = decodeRefreshToken(incomingRefreshToken);
  const session = await db.session.findUnique({ where: { id: decoded.sid } });
  if (
    !session ||
    session.revokedAt ||
    session.expiresAt.getTime() < Date.now()
  ) {
    throw new ApiError(401, "Session is expired or has been revoked");
  }

  if (session.userId !== decoded._id) {
    throw new ApiError(401, "Refresh token does not match session");
  }

  return { decoded, session };
};

const decodeRefreshToken = (incomingRefreshToken: string): RefreshTokenPayload => {
  let decoded: string | jwt.JwtPayload;
  try {
    decoded = jwt.verify(
      incomingRefreshToken,
      getRequiredEnv("REFRESH_TOKEN_SECRET")
    );
  } catch {
    throw new ApiError(401, "Refresh token is invalid or expired");
  }
  if (typeof decoded !== "object" || decoded === null) {
    throw new ApiError(401, "Refresh token is invalid or expired");
  }

  const sid = char36Schema.safeParse(decoded.sid);
  const userId = char36Schema.safeParse(decoded._id);
  if (!sid.success || !userId.success) {
    throw new ApiError(401, "Refresh token is invalid or expired");
  }
  return { sid: sid.data, _id: userId.data };
};

export const revokeSessionByRefreshToken = async (incomingRefreshToken: string) => {
  if (!incomingRefreshToken) return;
  try {
    const decoded = decodeRefreshToken(incomingRefreshToken);
    await db.session.update({
      where: { id: decoded.sid },
      data: { revokedAt: new Date() },
    });
  } catch {
    throw new ApiError(400,"someting wrong in revoked date")
  }
};