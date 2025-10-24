import type { NextFunction, Request, Response } from "express";

import { StatusCodes } from "http-status-codes";

import { UserRole } from "@prisma/client";

import { env } from "@/config";
import { ApiError } from "@/lib/apiError";
import { getUserById } from "@/features/auth/auth.service";
import { verifyAuthToken } from "@/utils/token";

const parseCookies = (headerValue: string | undefined) => {
  if (!headerValue) {
    return {} as Record<string, string>;
  }

  return headerValue.split(";").reduce((accumulator, pair) => {
    const [rawKey, rawValue] = pair.trim().split("=");
    if (!rawKey || rawValue === undefined) {
      return accumulator;
    }
    return {
      ...accumulator,
      [decodeURIComponent(rawKey)]: decodeURIComponent(rawValue)
    };
  }, {} as Record<string, string>);
};

const extractTokenFromRequest = (req: Request) => {
  const cookies = parseCookies(req.headers.cookie);
  if (cookies[env.AUTH_COOKIE_NAME]) {
    return cookies[env.AUTH_COOKIE_NAME];
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.replace("Bearer ", "").trim();
  }

  return null;
};

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const token = extractTokenFromRequest(req);

  if (!token) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Authentication required");
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid authentication token");
  }

  const user = await getUserById(payload.userId);
  if (!user) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Account not available");
  }

  res.locals.authUser = user;

  next();
};

export const requireRole = (allowedRoles: UserRole[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    await requireAuth(req, res, async (innerError) => {
      if (innerError) {
        next(innerError);
        return;
      }

      const authUser = res.locals.authUser;
      if (!authUser || !allowedRoles.includes(authUser.role)) {
        next(new ApiError(StatusCodes.FORBIDDEN, "You do not have access to this resource"));
        return;
      }

      next();
    });
  };
