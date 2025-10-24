import type { NextFunction, Request, Response } from "express";

import { env } from "@/config";
import { ApiError } from "@/lib/apiError";
import { getRequestLogger } from "@/lib/requestContext";
import { sendResponse } from "@/lib/sendResponse";
import { getRequestContext } from "@/lib/requestContext";
import { notifyOpsAlert } from "@/utils/opsAlert";

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

  if (statusCode >= 500) {
    const context = getRequestContext();
    const alertLines = [
      `Status: ${statusCode}`,
      `Message: ${message}`,
      context?.requestId ? `Request ID: ${context.requestId}` : null,
    ].filter((line): line is string => Boolean(line));

    void notifyOpsAlert({
      subject: "[QuizGen] API error detected",
      message: alertLines.join("\n"),
    });
  }

  return sendResponse(res, statusCode, {
    success: false,
    message,
    data: env.NODE_ENV !== "production" ? details : undefined
  });
};

