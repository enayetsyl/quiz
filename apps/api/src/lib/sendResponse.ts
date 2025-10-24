import type { Response } from "express";

import type { ApiResponsePayload } from "@quizgen/shared";

export const sendResponse = <T>(
  res: Response,
  statusCode: number,
  payload: ApiResponsePayload<T>
) => {
  const { success, message, data, meta } = payload;

  return res.status(statusCode).json({
    success,
    message: message ?? null,
    data: data ?? null,
    meta: meta ?? null
  });
};

