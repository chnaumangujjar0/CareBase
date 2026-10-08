import type { Request } from "express";
import { z } from "zod";
import { ApiError } from "./apiError";


export const parseOrThrow = <S extends z.ZodType>(
  schema: S,
  input: unknown
): z.output<S> => {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ApiError(400, result.error.issues[0]?.message ?? "Invalid request");
  }
  return result.data;
};

export const uuidSchema = z.string().uuid("Invalid id");
export const idParamSchema = z.object({ id: uuidSchema });

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const buildPagination = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

export const BED_STATUSES = [
  "available",
  "occupied",
  "cleaning",
  "maintenance",
  "reserved",
] as const;

export const MANUAL_BED_STATUSES = [
  "available",
  "cleaning",
  "maintenance",
  "reserved",
] as const;


const errorCode = (error: unknown): string | undefined =>
  typeof error === "object" && error !== null && "code" in error
    ? String((error as { code: unknown }).code)
    : undefined;


export const isUniqueViolation = (error: unknown): boolean =>
  ["P2002", "23505"].includes(errorCode(error) ?? "");

export const isForeignKeyViolation = (error: unknown): boolean =>
  ["P2003", "23503"].includes(errorCode(error) ?? "");