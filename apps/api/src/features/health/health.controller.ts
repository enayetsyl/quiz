import type { Request, Response } from "express";
import httpStatus from "http-status-codes";

import { catchAsync } from "@/lib/catchAsync";
import { sendResponse } from "@/lib/sendResponse";

import { getHealthStatus } from "./health.service";

type HealthQuery = {
  details?: boolean;
};

export const healthCheck = catchAsync(
  async (req: Request<unknown, unknown, unknown, HealthQuery>, res: Response) => {
    const showDetails = req.query.details === true;
    const data = getHealthStatus(showDetails);

    return sendResponse(res, httpStatus.OK, {
      success: true,
      message: "Service healthy",
      data
    });
  }
);
