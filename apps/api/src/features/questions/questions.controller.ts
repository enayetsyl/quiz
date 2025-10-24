import type { Request, Response } from "express";

import { StatusCodes } from "http-status-codes";

import type { AuthenticatedUser } from "@/features/auth/auth.service";
import { ApiError } from "@/lib/apiError";
import { catchAsync } from "@/lib/catchAsync";
import { sendResponse } from "@/lib/sendResponse";

import {
  bulkDeleteQuestions,
  bulkPublishQuestions,
  bulkUpdateQuestionStatus,
  listQuestions,
  updateQuestion,
} from "./questions.service";
import {
  bulkPublishSchema,
  bulkQuestionIdsSchema,
  bulkStatusSchema,
  listQuestionsQuerySchema,
  questionIdSchema,
  updateQuestionSchema,
} from "./questions.schema";

export const listQuestionsHandler = catchAsync(async (req: Request, res: Response) => {
  const parsed = listQuestionsQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid query parameters");
  }

  const questions = await listQuestions(parsed.data);

  return sendResponse(res, StatusCodes.OK, {
    success: true,
    message: "Questions retrieved",
    data: questions,
  });
});

export const updateQuestionHandler = catchAsync(async (req: Request, res: Response) => {
  const idResult = questionIdSchema.safeParse(req.params.questionId);
  if (!idResult.success) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "A valid question id is required");
  }

  const payloadResult = updateQuestionSchema.safeParse(req.body);
  if (!payloadResult.success) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid question payload");
  }

  const reviewer = res.locals.authUser as AuthenticatedUser | undefined;
  if (!reviewer) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Authentication required");
  }

  const question = await updateQuestion(idResult.data, payloadResult.data, reviewer);

  return sendResponse(res, StatusCodes.OK, {
    success: true,
    message: "Question updated",
    data: question,
  });
});

export const bulkUpdateStatusHandler = catchAsync(async (req: Request, res: Response) => {
  const parsed = bulkStatusSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "A valid status update payload is required");
  }

  const reviewer = res.locals.authUser as AuthenticatedUser | undefined;
  if (!reviewer) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Authentication required");
  }

  const result = await bulkUpdateQuestionStatus(parsed.data, reviewer);

  return sendResponse(res, StatusCodes.OK, {
    success: true,
    message: "Question statuses updated",
    data: result,
  });
});

export const bulkDeleteQuestionsHandler = catchAsync(async (req: Request, res: Response) => {
  const parsed = bulkQuestionIdsSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "A valid deletion payload is required");
  }

  const result = await bulkDeleteQuestions(parsed.data);

  return sendResponse(res, StatusCodes.OK, {
    success: true,
    message: "Questions deleted",
    data: result,
  });
});

export const bulkPublishQuestionsHandler = catchAsync(async (req: Request, res: Response) => {
  const parsed = bulkPublishSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "A valid publish payload is required");
  }

  const reviewer = res.locals.authUser as AuthenticatedUser | undefined;
  if (!reviewer) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Authentication required");
  }

  const result = await bulkPublishQuestions(parsed.data, reviewer);

  return sendResponse(res, StatusCodes.OK, {
    success: true,
    message: "Questions published to the Question Bank",
    data: result,
  });
});

