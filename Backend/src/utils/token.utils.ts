import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { ApiError } from "./apiError.js";
import { db } from "../prisma/db.js";

const DEFAULT_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days fallback

const getRequiredEnv = (key: string) => {
  const value = process.env[key];
  if (!value) {
    throw new ApiError(500, `${key} is not configured`);
  }
  return value;
};

const parseExpiryToMs = (expiry?: string) => {
  if (!expiry) return new Date(Date.now() + DEFAULT_SESSION_TTL_MS);

  const value = Number(expiry.slice(0, -1));
  const unit = expiry.slice(-1).toLowerCase();
  const date = new Date();

  if (unit === "d") {
    date.setDate(date.getDate() + value);
  }
  if (unit === "h") {
    date.setHours(date.getHours() + value);
  }
  if (unit === "m") {
    date.setMinutes(date.getMinutes() + value);
  }
  if (unit === "s") {
    date.setSeconds(date.getSeconds() + value);
  }

  return date;
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
    throw new ApiError(500, "Something went wrong while generating tokens");
  }
};
