import { createHash } from "node:crypto";

import type { NextFunction, Request, Response } from "express";

import { StatusCodes } from "http-status-codes";

import { env } from "@/config";
import { getApiBearerTokenHash } from "@/features/settings/settings.service";
import { ApiError } from "@/lib/apiError";

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const requireInternalBearer = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const header = req.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Authorization header missing");
    }

    const token = header.slice(7).trim();

    if (!token) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Authorization header missing");
    }

    const storedHash = await getApiBearerTokenHash();
    let isValid = false;

    if (storedHash) {
      isValid = hashToken(token) === storedHash;
    }

    if (!isValid && env.INTERNAL_API_BEARER) {
      isValid = token === env.INTERNAL_API_BEARER;
    }

    if (!isValid) {
      throw new ApiError(StatusCodes.FORBIDDEN, "Invalid credentials");
    }

    next();
  } catch (error) {
    next(error);
  }
};
