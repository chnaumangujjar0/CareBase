import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { ApiError } from "./apiError.js";
import { db } from "../prisma/db.js";
import  "temporal-polyfill/global";
const DEFAULT_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days fallback

const getRequiredEnv = (key: string) => {
  const value = process.env[key];
  if (!value) {
    throw new ApiError(500, `${key} is not configured`);
  }
  return value;
};

const parseExpiryToMs = (expiry?: string): Temporal.Instant => {
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

  return Temporal.Instant.fromEpochMilliseconds(Date.now() + ms);
};

export const generateAccessAndRefreshToken = async (
  userId: any,
  meta: { userAgent?: string; ipAddress?: string  } = {}
) => {
  const user = await db.orm.public.User.where({ id: userId }).first();
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

    const session = await db.orm.public.Session.create({
      userId: user.id,
      tokenHash: "pending",
      ipAddress: meta.ipAddress || null,
      userAgent: meta.userAgent || null,
      expiresAt: parseExpiryToMs(refreshExpiry),
    });

    const refreshToken = jwt.sign(
      { _id: user.id, sid: session.id },
      refreshSecret,
      { expiresIn: refreshExpiry as SignOptions["expiresIn"] }
    );

    const updatedSession = await db.orm.public.Session.where({id: session.id}).update({tokenHash:refreshToken})

    return { accessToken, refreshToken };
  } catch (error) {
    if(error instanceof Error){
      console.log(error.message);
    }
    throw new ApiError(500, "Something went wrong while generating tokens");
  }
};
