import type { NextFunction, Request, Response } from "express";

type AsyncMiddleware = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export const catchAsync =
  (fn: AsyncMiddleware) => (req: Request, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next);

