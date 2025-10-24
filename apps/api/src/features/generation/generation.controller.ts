import type { Request, Response } from "express";

import { StatusCodes } from "http-status-codes";

import type { AuthenticatedUser } from "@/features/auth/auth.service";
import { ApiError } from "@/lib/apiError";
import { catchAsync } from "@/lib/catchAsync";
import { sendResponse } from "@/lib/sendResponse";

import {
  getGenerationOverview,
  regeneratePage,
  retryFailedPage,
  startUploadGeneration,
} from "./generation.service";
import { pageIdParamSchema, uploadIdParamSchema } from "./generation.schema";

export const getGenerationOverviewHandler = catchAsync(async (req: Request, res: Response) => {
  const { uploadId } = uploadIdParamSchema.parse(req.params);
  const overview = await getGenerationOverview(uploadId);

  return sendResponse(res, StatusCodes.OK, {
    success: true,
    message: "Generation overview retrieved",
    data: overview,
  });
});

export const startGenerationHandler = catchAsync(async (req: Request, res: Response) => {
  const { uploadId } = uploadIdParamSchema.parse(req.params);
  const authUser = res.locals.authUser as AuthenticatedUser | undefined;

  if (!authUser) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Authentication required");
  }

  const overview = await startUploadGeneration(uploadId, authUser);

  return sendResponse(res, StatusCodes.OK, {
    success: true,
    message: "Generation started",
    data: overview,
  });
});

export const retryPageGenerationHandler = catchAsync(async (req: Request, res: Response) => {
  const { pageId } = pageIdParamSchema.parse(req.params);
  const overview = await retryFailedPage(pageId);

  return sendResponse(res, StatusCodes.OK, {
    success: true,
    message: "Page requeued for generation",
    data: overview,
  });
});

export const regeneratePageHandler = catchAsync(async (req: Request, res: Response) => {
  const { pageId } = pageIdParamSchema.parse(req.params);
  const overview = await regeneratePage(pageId);

  return sendResponse(res, StatusCodes.OK, {
    success: true,
    message: "Page regeneration scheduled",
    data: overview,
  });
});
