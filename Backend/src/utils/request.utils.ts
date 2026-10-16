import type { Request } from "express";
import { z } from "zod";
import { ApiError } from "./apiError.js";

export const getTenantContext = (req: Request) => {
  const tenantId = req.user?.tenantId;
  const userId = req.user?.id;
  if (!tenantId || !userId) {
    throw new ApiError(401, "Authenticated tenant context is required");
  }
  return { tenantId, userId };
};

export const parseRequest = <T extends z.ZodType>(
  schema: T,
  input: unknown,
  message = "Invalid request details",
): z.output<T> => {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new ApiError(400, message, parsed.error.issues.map(({ path, message: detail }) => ({
      path: path.join("."),
      message: detail,
    })));
  }
  return parsed.data;
};

export const parseParamUuid = (req: Request, key: string) => {
  const value = req.params[key];
  const parsed = z.uuid().safeParse(Array.isArray(value) ? value[0] : value);
  if (!parsed.success) {
    throw new ApiError(400, `A valid ${key} is required`);
  }
  return parsed.data;
};
