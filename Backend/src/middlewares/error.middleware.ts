import type { ErrorRequestHandler } from "express";
import { ApiError } from "../utils/apiError";
import { ApiResponse } from "../utils/apiResponse";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const apiError = error instanceof ApiError
    ? error
    : new ApiError(500, "Internal server error");

  if (apiError.statusCode >= 500) {
    console.error(error);
  }

  return res.status(apiError.statusCode).json(
    new ApiResponse(apiError.statusCode, apiError.data, apiError.message),
  );
};