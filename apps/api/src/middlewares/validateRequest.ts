import type { NextFunction, Request, Response } from "express";
import { ZodError, type AnyZodObject } from "zod";

import { ApiError } from "@/lib/apiError";

export const validateRequest =
  (schema: AnyZodObject) => (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params
      });

      req.body = parsed.body;
      req.query = parsed.query;
      req.params = parsed.params;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ApiError(422, "Validation failed", { isOperational: true });
      }

      if (error instanceof Error) {
        throw new ApiError(422, error.message, { isOperational: true });
      }

      next(error);
    }
  };
