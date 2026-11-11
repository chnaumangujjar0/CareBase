import type { RequestHandler } from "express";
import { createHash } from "node:crypto";
import { ApiResponse } from "../utils/apiResponse.js";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_IP = 5;
const MAX_REQUESTS_PER_EMAIL = 3;
const buckets = new Map<string, { count: number; resetAt: number }>();

const increment = (key: string, now: number): number | null => {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }
  bucket.count += 1;
  return bucket.count > (key.startsWith("password-reset:email:") ? MAX_REQUESTS_PER_EMAIL : MAX_REQUESTS_PER_IP)
    ? bucket.resetAt
    : null;
};

export const passwordResetRateLimit: RequestHandler = (req, res, next) => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const accountHash = email ? createHash("sha256").update(email).digest("hex") : null;
  const retryAt = [
    increment(`password-reset:ip:${ip}`, now),
    ...(accountHash ? [increment(`password-reset:email:${accountHash}`, now)] : []),
  ].find((value) => value !== null);

  if (retryAt) {
    res.setHeader("Retry-After", Math.ceil((retryAt - now) / 1000));
    res.status(429).json(new ApiResponse(429, null, "Too many password reset requests. Please try again later."));
    return;
  }
  next();
};
