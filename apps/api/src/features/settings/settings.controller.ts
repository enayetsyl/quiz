import type { Request, Response } from "express";

import { StatusCodes } from "http-status-codes";

import { ApiError } from "@/lib/apiError";
import { catchAsync } from "@/lib/catchAsync";
import { sendResponse } from "@/lib/sendResponse";

import { getAppSettings, rotateApiBearerToken, updateAppSettings } from "./settings.service";
import { updateSettingsSchema } from "./settings.schema";

export const getSettings = catchAsync(async (_req: Request, res: Response) => {
  const settings = await getAppSettings();

  return sendResponse(res, StatusCodes.OK, {
    success: true,
    message: "Settings loaded",
    data: settings
  });
});

export const updateSettings = catchAsync(async (req: Request, res: Response) => {
  const parsed = updateSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid settings payload");
  }

  const settings = await updateAppSettings(parsed.data);

  return sendResponse(res, StatusCodes.OK, {
    success: true,
    message: "Settings updated",
    data: settings
  });
});

export const rotateApiToken = catchAsync(async (_req: Request, res: Response) => {
  const { token } = await rotateApiBearerToken();

  return sendResponse(res, StatusCodes.OK, {
    success: true,
    message: "API token rotated",
    data: { token }
  });
});
