import type { NextFunction, Request, Response } from "express";

import { env } from "@/config";
import { ApiError } from "@/lib/apiError";
import { getRequestLogger } from "@/lib/requestContext";
import { sendResponse } from "@/lib/sendResponse";

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  let statusCode = 500;
  let message = "Internal server error";
  let details: unknown = undefined;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof Error) {
    message = err.message || message;
  }

  if (env.NODE_ENV !== "production") {
    details = err instanceof Error ? err.stack : err;
  }

  const requestLogger = getRequestLogger();
  requestLogger.error({ err, statusCode }, "Request failed");

  return sendResponse(res, statusCode, {
    success: false,
    message,
    data: env.NODE_ENV !== "production" ? details : undefined
  });
};

