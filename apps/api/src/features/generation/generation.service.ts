import { StatusCodes } from "http-status-codes";

import {
  DifficultyLevel,
  LanguageCode,
  OptionKey,
  PageStatus,
  QuestionStatus,
} from "@prisma/client";

import type { AuthenticatedUser } from "@/features/auth/auth.service";
import { ApiError } from "@/lib/apiError";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { createPresignedUrl } from "@/utils/s3";

import type {
  GenerationAttemptDto,
  GenerationPageDto,
  GenerationStatusCounts,
  GenerationUploadOverview,
  UploadPageStatus,
} from "@quizgen/shared";

import { enqueueGenerationJobs, type GenerationJobInput } from "./generation.queue";
import { geminiClient } from "./gemini.client";
import { generationResponseSchema } from "./generation.schema";

const buildInitialStatusCounts = (): GenerationStatusCounts => ({
  pending: 0,
  queued: 0,
  generating: 0,
  complete: 0,
  failed: 0,
});

const mapAttemptsToDto = (
  attempts: {
    id: string;
    attemptNo: number;
    model: string;
    promptVersion: string;
    isSuccess: boolean;
    errorMessage: string | null;
    requestExcerpt: string | null;
    responseExcerpt: string | null;
    createdAt: Date;
  }[],
): GenerationAttemptDto[] =>
  attempts
    .slice()
    .sort((a, b) => b.attemptNo - a.attemptNo)
    .map((attempt) => ({
      id: attempt.id,
      attemptNo: attempt.attemptNo,
      model: attempt.model,
      promptVersion: attempt.promptVersion,
      isSuccess: attempt.isSuccess,
      errorMessage: attempt.errorMessage,
      requestExcerpt: attempt.requestExcerpt,
      responseExcerpt: attempt.responseExcerpt,
      createdAt: attempt.createdAt.toISOString(),
    }));

const mapPageToDto = async (
  page: {
    id: string;
    pageNumber: number;
    status: PageStatus;
    language: LanguageCode | null;
    lastGeneratedAt: Date | null;
    s3PngKey: string;
    s3ThumbKey: string;
    updatedAt: Date;
    pageGenerationAttempts: {
      id: string;
      attemptNo: number;
      model: string;
      promptVersion: string;
      isSuccess: boolean;
      errorMessage: string | null;
      requestExcerpt: string | null;
      responseExcerpt: string | null;
      createdAt: Date;
    }[];
    _count: { questions: number };
  },
  bucket: string,
): Promise<GenerationPageDto> => {
  const [pngUrl, thumbnailUrl] = await Promise.all([
    createPresignedUrl({ bucket, key: page.s3PngKey }),
    createPresignedUrl({ bucket, key: page.s3ThumbKey }),
  ]);

  const status = page.status as UploadPageStatus;

  return {
    id: page.id,
    pageNumber: page.pageNumber,
    status,
    language: page.language,
    lastGeneratedAt: page.lastGeneratedAt ? page.lastGeneratedAt.toISOString() : null,
    questionCount: page._count.questions,
    pngUrl,
    thumbnailUrl,
    attempts: mapAttemptsToDto(page.pageGenerationAttempts),
  };
};

export const getGenerationOverview = async (
  uploadId: string,
): Promise<GenerationUploadOverview> => {
  const upload = await prisma.upload.findUnique({
    where: { id: uploadId },
    include: {
      pages: {
        include: {
          pageGenerationAttempts: true,
          _count: {
            select: { questions: true },
          },
        },
        orderBy: { pageNumber: "asc" },
      },
    },
  });

  if (!upload) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Upload not found");
  }

  const statusCounts = buildInitialStatusCounts();

  const pages = await Promise.all(
    upload.pages.map(async (page) => {
      const dto = await mapPageToDto(page, upload.s3Bucket);
      statusCounts[dto.status] += 1;
      return dto;
    }),
  );

  return {
    id: upload.id,
    chapterId: upload.chapterId,
    originalFilename: upload.originalFilename,
    createdAt: upload.createdAt.toISOString(),
    pagesCount: upload.pagesCount,
    statusCounts,
    pages,
  };
};

const markPagesQueued = async (pageIds: string[]) => {
  if (pageIds.length === 0) {
    return;
  }

  const now = new Date();
  await prisma.page.updateMany({
    where: { id: { in: pageIds } },
    data: {
      status: PageStatus.queued,
      updatedAt: now,
    },
  });
};

const prepareJobPayloads = (pageIds: string[]): GenerationJobInput[] =>
  pageIds.map((pageId) => ({ pageId }));

export const startUploadGeneration = async (
  uploadId: string,
  _user: AuthenticatedUser,
): Promise<GenerationUploadOverview> => {
  const pages = await prisma.page.findMany({
    where: { uploadId, status: PageStatus.pending },
    select: { id: true },
  });

  if (pages.length === 0) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "No pages are pending generation for the selected upload",
    );
  }

  const pageIds = pages.map((page) => page.id);

  await markPagesQueued(pageIds);
  await enqueueGenerationJobs(prepareJobPayloads(pageIds));

  return getGenerationOverview(uploadId);
};

export const retryFailedPage = async (
  pageId: string,
): Promise<GenerationUploadOverview> => {
  const page = await prisma.page.findUnique({
    where: { id: pageId },
    select: { id: true, uploadId: true, status: true },
  });

  if (!page) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Page not found");
  }

  if (page.status !== PageStatus.failed) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Only failed pages can be retried",
    );
  }

  await markPagesQueued([page.id]);
  await enqueueGenerationJobs(prepareJobPayloads([page.id]));

  return getGenerationOverview(page.uploadId);
};

export const regeneratePage = async (
  pageId: string,
): Promise<GenerationUploadOverview> => {
  const page = await prisma.page.findUnique({
    where: { id: pageId },
    select: { id: true, uploadId: true },
  });

  if (!page) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Page not found");
  }

  const lockedQuestion = await prisma.question.findFirst({
    where: { pageId, isLockedAfterAdd: true },
    select: { id: true },
  });

  if (lockedQuestion) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "This page contains questions already published to the Question Bank",
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.question.deleteMany({ where: { pageId } });
    await tx.page.update({
      where: { id: pageId },
      data: {
        status: PageStatus.queued,
        lastGeneratedAt: null,
        updatedAt: new Date(),
      },
    });
  });

  await enqueueGenerationJobs(prepareJobPayloads([pageId]));

  return getGenerationOverview(page.uploadId);
};

const RETRY_DELAYS_MS = [5000, 15000, 45000] as const;
const MAX_ATTEMPTS = 3;

const resolveLanguage = (
  preferred: "bn" | "en" | null,
  fallback: LanguageCode | null,
): LanguageCode => {
  if (preferred === "bn" || preferred === "en") {
    return preferred as LanguageCode;
  }

  return fallback ?? LanguageCode.en;
};

export const handleGenerationSuccess = async (
  params: {
    pageId: string;
    upload: {
      id: string;
      classId: number;
      subjectId: string;
      chapterId: string;
    };
    language: LanguageCode;
    attemptId: string;
    promptSummary: string;
  },
  payload: {
    questions: {
      lineIndex: number;
      stem: string;
      difficulty: DifficultyLevel;
      explanation: string;
      correctOption: OptionKey;
      options: { key: OptionKey; text: string }[];
    }[];
    tokensIn: number | undefined;
    tokensOut: number | undefined;
    responseExcerpt: string;
  },
) => {
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.question.deleteMany({ where: { pageId: params.pageId } });

    await tx.question.createMany({
      data: payload.questions.map((question) => {
        const optionMap = new Map<OptionKey, string>(
          question.options.map((option) => [option.key, option.text]),
        );

        return {
          pageId: params.pageId,
          classId: params.upload.classId,
          subjectId: params.upload.subjectId,
          chapterId: params.upload.chapterId,
          language: params.language,
          difficulty: question.difficulty,
          stem: question.stem,
          optionA: optionMap.get(OptionKey.a) ?? "",
          optionB: optionMap.get(OptionKey.b) ?? "",
          optionC: optionMap.get(OptionKey.c) ?? "",
          optionD: optionMap.get(OptionKey.d) ?? "",
          correctOption: question.correctOption,
          explanation: question.explanation,
          lineIndex: question.lineIndex,
          status: QuestionStatus.not_checked,
          createdAt: now,
          updatedAt: now,
        };
      }),
    });

    await tx.page.update({
      where: { id: params.pageId },
      data: {
        status: PageStatus.complete,
        language: params.language,
        lastGeneratedAt: now,
        updatedAt: now,
      },
    });

    await tx.pageGenerationAttempt.update({
      where: { id: params.attemptId },
      data: {
        isSuccess: true,
        responseExcerpt: payload.responseExcerpt,
      },
    });

    await tx.llmUsageEvent.create({
      data: {
        pageId: params.pageId,
        attemptId: params.attemptId,
        model: MODEL_NAME,
        tokensIn: payload.tokensIn ?? null,
        tokensOut: payload.tokensOut ?? null,
      },
    });
  });
};

const MODEL_NAME = "gemini-2.5-flash";
const PROMPT_VERSION = "v1";

export const processGenerationAttempt = async (
  pageId: string,
  options: { scheduleRetry: (pageId: string, attemptNo: number) => Promise<void> },
) => {
  const page = await prisma.page.findUnique({
    where: { id: pageId },
    include: {
      upload: true,
      pageGenerationAttempts: {
        orderBy: { attemptNo: "asc" },
        select: { attemptNo: true },
      },
    },
  });

  if (!page) {
    logger.warn({ pageId }, "Skipping generation: page not found");
    return;
  }

  const attemptNo = page.pageGenerationAttempts.length + 1;

  await prisma.page.update({
    where: { id: page.id },
    data: {
      status: PageStatus.generating,
      updatedAt: new Date(),
    },
  });

  const promptSummary = `Generate MCQs for upload ${page.uploadId} page ${page.pageNumber}`;

  const attempt = await prisma.pageGenerationAttempt.create({
    data: {
      pageId: page.id,
      attemptNo,
      model: MODEL_NAME,
      promptVersion: PROMPT_VERSION,
      requestExcerpt: promptSummary,
    },
  });

  try {
    const rawResponse = await geminiClient.generateQuestions({
      pageId: page.id,
      pageNumber: page.pageNumber,
      language: page.language,
    });

    const parsed = generationResponseSchema.parse(rawResponse);

    const sortedQuestions = parsed.questions
      .slice()
      .sort((a, b) => a.lineIndex - b.lineIndex)
      .map((question) => ({
        ...question,
        difficulty: question.difficulty as DifficultyLevel,
        correctOption: question.correctOption as OptionKey,
        options: question.options.map((option) => ({
          key: option.key as OptionKey,
          text: option.text,
        })),
      }));

    const responseExcerpt = sortedQuestions
      .map((question) => `${question.lineIndex}: ${question.stem}`)
      .slice(0, 3)
      .join(" | ");

    const language = resolveLanguage(parsed.language ?? null, page.language);

    await handleGenerationSuccess(
      {
        pageId: page.id,
        upload: {
          id: page.uploadId,
          classId: page.upload.classId,
          subjectId: page.upload.subjectId,
          chapterId: page.upload.chapterId,
        },
        language,
        attemptId: attempt.id,
        promptSummary,
      },
      {
        questions: sortedQuestions,
        tokensIn: parsed.tokensIn,
        tokensOut: parsed.tokensOut,
        responseExcerpt,
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Generation attempt failed";
    const nextAttempt = attemptNo + 1;

    await prisma.pageGenerationAttempt.update({
      where: { id: attempt.id },
      data: {
        errorMessage,
      },
    });

    if (nextAttempt > MAX_ATTEMPTS) {
      await prisma.page.update({
        where: { id: page.id },
        data: {
          status: PageStatus.failed,
          updatedAt: new Date(),
        },
      });
      logger.error({ pageId: page.id, error: errorMessage }, "Generation failed after maximum attempts");
      return;
    }

    await prisma.page.update({
      where: { id: page.id },
      data: {
        status: PageStatus.queued,
        updatedAt: new Date(),
      },
    });

    await options.scheduleRetry(page.id, attemptNo);
    logger.warn(
      { pageId: page.id, attemptNo, error: errorMessage },
      "Generation attempt failed; scheduled retry",
    );
  }
};

export const scheduleRetry = async (pageId: string, attemptNo: number) => {
  const baseDelay = RETRY_DELAYS_MS[Math.min(attemptNo - 1, RETRY_DELAYS_MS.length - 1)];
  const jitter = Math.floor(Math.random() * 1000);
  await enqueueGenerationJobs([{ pageId, delayMs: baseDelay + jitter }]);
};
