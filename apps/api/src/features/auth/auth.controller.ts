import type { Request, Response } from "express";

import { StatusCodes } from "http-status-codes";

import { env } from "@/config";
import { ApiError } from "@/lib/apiError";
import { catchAsync } from "@/lib/catchAsync";
import { getRequestLogger } from "@/lib/requestContext";
import { sendResponse } from "@/lib/sendResponse";
import { sendEmail } from "@/utils/email";

import {
  authenticateWithPassword,
  createPasswordResetRequest,
  getUserById,
  resetPasswordWithToken
} from "./auth.service";
import { loginSchema, passwordResetRequestSchema, passwordResetSchema } from "./auth.schema";

const buildSessionCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.NODE_ENV === "production",
  maxAge: env.AUTH_TOKEN_TTL_MINUTES * 60 * 1000,
  path: "/"
});

const setSessionCookie = (res: Response, token: string) => {
  res.cookie(env.AUTH_COOKIE_NAME, token, buildSessionCookieOptions());
};

export const login = catchAsync(async (req: Request, res: Response) => {
  const parsedBody = loginSchema.safeParse(req.body);

  if (!parsedBody.success) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid email or password");
  }

  const { email, password } = parsedBody.data;
  const authResult = await authenticateWithPassword(email, password);

  if (!authResult) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid email or password");
  }

  setSessionCookie(res, authResult.token);

  return sendResponse(res, StatusCodes.OK, {
    success: true,
    message: "Signed in successfully",
    data: authResult.user
  });
});

export const logout = catchAsync(async (_req: Request, res: Response) => {
  res.clearCookie(env.AUTH_COOKIE_NAME, buildSessionCookieOptions());

  return sendResponse(res, StatusCodes.OK, {
    success: true,
    message: "Signed out",
    data: null
  });
});

export const me = catchAsync(async (_req: Request, res: Response) => {
  const authUser = res.locals.authUser;

  if (!authUser) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Not authenticated");
  }

  const user = await getUserById(authUser.id);

  if (!user) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Not authenticated");
  }

  return sendResponse(res, StatusCodes.OK, {
    success: true,
    message: "Authenticated",
    data: user
  });
});

export const requestPasswordReset = catchAsync(async (req: Request, res: Response) => {
  const parsedBody = passwordResetRequestSchema.safeParse(req.body);
  if (!parsedBody.success) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid email address");
  }

  const { email } = parsedBody.data;
  const result = await createPasswordResetRequest(email);

  if (result.user && result.token && env.SES_FROM) {
    const logger = getRequestLogger();

    try {
      await sendEmail({
        to: result.user.email,
        subject: "Password reset requested",
        textBody: `Use the following token to reset your password: ${result.token}`
      });
    } catch (error) {
      logger.warn({ error }, "Failed to send password reset email");
    }
  }

  return sendResponse(res, StatusCodes.OK, {
    success: true,
    message: "If the account exists and is active, a reset email has been sent.",
    data: env.NODE_ENV !== "production" ? { token: result.token } : null
  });
});

export const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const parsedBody = passwordResetSchema.safeParse(req.body);
  if (!parsedBody.success) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid reset payload");
  }

  const { token, password } = parsedBody.data;
  const success = await resetPasswordWithToken(token, password);

  if (!success) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Reset token is invalid or expired");
  }

  return sendResponse(res, StatusCodes.OK, {
    success: true,
    message: "Password updated successfully",
    data: null
  });
});
