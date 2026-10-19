import { createHash } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ApiResponse } from "../utils/apiResponse.js";

const WINDOW_MS = 15 * 60_000;
const MAX_PER_IP = 10;
const MAX_PER_ACCOUNT = 5;
const MAX_BUCKETS = 10_000;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

const incrementBucket = (key: string, now: number, max: number): number | null => {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }
  if (bucket.count >= max) return bucket.resetAt;
  bucket.count += 1;
  return null;
};

export const loginRateLimit: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const now = Date.now();
  const address = req.ip || req.socket.remoteAddress || "unknown";
  const account = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const accountHash = account ? createHash("sha256").update(account).digest("hex") : null;
  const retryAt = [
    incrementBucket(`login:ip:${address}`, now, MAX_PER_IP),
    ...(accountHash ? [incrementBucket(`login:account:${accountHash}`, now, MAX_PER_ACCOUNT)] : []),
  ].filter((time): time is number => time !== null).sort((a, b) => a - b)[0];

  if (buckets.size > MAX_BUCKETS) {
    for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
    while (buckets.size > MAX_BUCKETS) {
      const oldestKey = buckets.keys().next().value as string | undefined;
      if (!oldestKey) break;
      buckets.delete(oldestKey);
    }
  }

  if (retryAt !== undefined) {
    const retryAfterSeconds = Math.max(1, Math.ceil((retryAt - now) / 1000));
    res.setHeader("Retry-After", String(retryAfterSeconds));
    res.status(429).json(new ApiResponse(429, null, "Too many login attempts. Please wait before trying again."));
    return;
  }
  next();
};
