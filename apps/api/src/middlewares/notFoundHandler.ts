import type { Request, Response, NextFunction } from "express";

import { ApiError } from "@/lib/apiError";

export const notFoundHandler = (_req: Request, _res: Response, next: NextFunction) => {
  next(new ApiError(404, "Resource not found"));
};

