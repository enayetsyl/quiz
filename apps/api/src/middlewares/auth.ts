import type { NextFunction, Request, Response } from "express";

import { env } from "@/config";
import { ApiError } from "@/lib/apiError";

type Role = "admin" | "approver";

export const requireAuth = (roles?: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw new ApiError(401, "Authorization header missing");
    }

    const token = authHeader.split(" ")[1];

    if (!env.INTERNAL_API_BEARER || token !== env.INTERNAL_API_BEARER) {
      throw new ApiError(403, "Invalid credentials");
    }

    req.user = {
      id: "system",
      role: roles?.[0] ?? "admin"
    };

    next();
  };
};

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      id: string;
      role: Role;
    };
  }
}
