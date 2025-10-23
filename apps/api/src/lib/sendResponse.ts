import type { Response } from "express";

type ApiMeta = {
  page?: number;
  limit?: number;
  total?: number;
  [key: string]: unknown;
};

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
  meta?: ApiMeta;
};

export const sendResponse = <T>(res: Response, statusCode: number, payload: ApiResponse<T>) => {
  return res.status(statusCode).json({
    success: payload.success,
    message: payload.message ?? null,
    data: payload.data ?? null,
    meta: payload.meta ?? null
  });
};

