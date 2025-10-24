import type { Request, Response } from "express";

import { StatusCodes } from "http-status-codes";

import { catchAsync } from "@/lib/catchAsync";
import { sendResponse } from "@/lib/sendResponse";

import { getOpsOverview } from "./ops.service";

export const fetchOpsOverview = catchAsync(async (_req: Request, res: Response) => {
  const data = await getOpsOverview();

  return sendResponse(res, StatusCodes.OK, {
    success: true,
    message: "Operations overview generated",
    data,
  });
});
