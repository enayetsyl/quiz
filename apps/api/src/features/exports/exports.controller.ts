import type { Request, Response } from "express";

import { StatusCodes } from "http-status-codes";

import { ApiError } from "@/lib/apiError";
import { catchAsync } from "@/lib/catchAsync";
import { sendResponse } from "@/lib/sendResponse";

import {
  getApprovedQuestionsForInternalApi,
  getQuestionBankExportCsv,
  getQuestionBankExportData,
  getQuestionExportCsv,
  getQuestionExportData
} from "./exports.service";
import {
  internalApprovedQuerySchema,
  questionBankExportQuerySchema,
  questionExportQuerySchema
} from "./exports.schema";

export const exportQuestionsHandler = catchAsync(async (req: Request, res: Response) => {
  const parsed = questionExportQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid export filters");
  }

  const { format, ...filters } = parsed.data;

  if (format === "csv") {
    const csv = await getQuestionExportCsv(filters);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=questions-export.csv");
    res.status(StatusCodes.OK).send(csv);
    return;
  }

  const data = await getQuestionExportData(filters);

  return sendResponse(res, StatusCodes.OK, {
    success: true,
    message: "Questions export ready",
    data,
    meta: { total: data.items.length }
  });
});

export const exportQuestionBankHandler = catchAsync(async (req: Request, res: Response) => {
  const parsed = questionBankExportQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid export filters");
  }

  const { format, ...filters } = parsed.data;

  if (format === "csv") {
    const csv = await getQuestionBankExportCsv(filters);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=question-bank-export.csv");
    res.status(StatusCodes.OK).send(csv);
    return;
  }

  const data = await getQuestionBankExportData(filters);

  return sendResponse(res, StatusCodes.OK, {
    success: true,
    message: "Question bank export ready",
    data,
    meta: { total: data.items.length }
  });
});

export const internalApprovedQuestionsHandler = catchAsync(async (req: Request, res: Response) => {
  const parsed = internalApprovedQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid query parameters");
  }

  const data = await getApprovedQuestionsForInternalApi(parsed.data);

  return sendResponse(res, StatusCodes.OK, {
    success: true,
    message: "Approved questions retrieved",
    data
  });
});
