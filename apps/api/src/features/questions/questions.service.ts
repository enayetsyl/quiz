import { StatusCodes } from "http-status-codes";

import {
  DifficultyLevel,
  OptionKey,
  Prisma,
  QuestionStatus as PrismaQuestionStatus,
} from "@prisma/client";

import type { AuthenticatedUser } from "@/features/auth/auth.service";
import { ApiError } from "@/lib/apiError";
import { prisma } from "@/lib/prisma";
import { createPresignedUrl } from "@/utils/s3";

import type {
  QuestionBulkDeleteResult,
  QuestionBulkPublishResult,
  QuestionBulkStatusResult,
  QuestionListFilters,
  QuestionListResponse,
  QuestionReviewItemDto,
  QuestionStatus,
  QuestionStatusCounts,
  QuestionUpdatePayload,
} from "@quizgen/shared";

const questionInclude = {
  page: {
    select: {
      id: true,
      pageNumber: true,
      s3PngKey: true,
      s3ThumbKey: true,
      upload: {
        select: {
          s3Bucket: true,
        },
      },
    },
  },
  questionBankCopies: {
    select: {
      id: true,
      seqNo: true,
      subjShortCode: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 1,
  },
} satisfies Prisma.QuestionInclude;

type QuestionWithRelations = Prisma.QuestionGetPayload<{
  include: typeof questionInclude;
}>;

type PageWithUpload = QuestionWithRelations["page"];

const createPageAssetLoader = () => {
  const cache = new Map<string, { pageImageUrl: string; pageThumbnailUrl: string }>();

  return async (page: PageWithUpload) => {
    const cached = cache.get(page.id);
    if (cached) {
      return cached;
    }

    const [pageImageUrl, pageThumbnailUrl] = await Promise.all([
      createPresignedUrl({ bucket: page.upload.s3Bucket, key: page.s3PngKey }),
      createPresignedUrl({ bucket: page.upload.s3Bucket, key: page.s3ThumbKey }),
    ]);

    const value = { pageImageUrl, pageThumbnailUrl };
    cache.set(page.id, value);
    return value;
  };
};

const toQuestionDto = async (
  question: QuestionWithRelations,
  loadAssets: (page: PageWithUpload) => Promise<{ pageImageUrl: string; pageThumbnailUrl: string }>,
): Promise<QuestionReviewItemDto> => {
  const { page } = question;
  const assets = await loadAssets(page);
  const bankEntry = question.questionBankCopies[0] ?? null;

  return {
    id: question.id,
    pageId: question.pageId,
    pageNumber: page.pageNumber,
    pageImageUrl: assets.pageImageUrl,
    pageThumbnailUrl: assets.pageThumbnailUrl,
    classId: question.classId,
    subjectId: question.subjectId,
    chapterId: question.chapterId,
    status: question.status,
    difficulty: question.difficulty,
    language: question.language,
    lineIndex: question.lineIndex,
    stem: question.stem,
    optionA: question.optionA,
    optionB: question.optionB,
    optionC: question.optionC,
    optionD: question.optionD,
    correctOption: question.correctOption,
    explanation: question.explanation,
    isLockedAfterAdd: question.isLockedAfterAdd,
    questionBankEntry: bankEntry
      ? {
          id: bankEntry.id,
          seqNo: bankEntry.seqNo,
          subjShortCode: bankEntry.subjShortCode,
          createdAt: bankEntry.createdAt.toISOString(),
        }
      : null,
    createdAt: question.createdAt.toISOString(),
    updatedAt: question.updatedAt.toISOString(),
  };
};

const emptyStatusCounts: QuestionStatusCounts = {
  not_checked: 0,
  approved: 0,
  rejected: 0,
  needs_fix: 0,
};

const mapStatusCounts = (
  grouped: { status: PrismaQuestionStatus; _count: { _all: number } }[],
): QuestionStatusCounts => {
  const counts: QuestionStatusCounts = { ...emptyStatusCounts };

  grouped.forEach((entry) => {
    counts[entry.status as QuestionStatus] = entry._count._all;
  });

  return counts;
};

const buildBaseWhere = (filters: QuestionListFilters): Prisma.QuestionWhereInput => {
  const where: Prisma.QuestionWhereInput = {};

  if (typeof filters.classId === "number") {
    where.classId = filters.classId;
  }

  if (filters.subjectId) {
    where.subjectId = filters.subjectId;
  }

  if (filters.chapterId) {
    where.chapterId = filters.chapterId;
  }

  if (filters.pageId) {
    where.pageId = filters.pageId;
  }

  return where;
};

const buildListWhere = (
  filters: QuestionListFilters,
): Prisma.QuestionWhereInput => {
  const baseWhere = buildBaseWhere(filters);

  if (filters.status && filters.status !== "all") {
    return {
      ...baseWhere,
      status: filters.status as PrismaQuestionStatus,
    } satisfies Prisma.QuestionWhereInput;
  }

  return baseWhere;
};

export const listQuestions = async (
  filters: QuestionListFilters,
): Promise<QuestionListResponse> => {
  const listWhere = buildListWhere(filters);
  const baseWhere = buildBaseWhere(filters);

  const [questions, total, groupedCounts] = await prisma.$transaction([
    prisma.question.findMany({
      where: listWhere,
      include: questionInclude,
      orderBy: [
        {
          page: { pageNumber: "asc" },
        },
        { lineIndex: "asc" },
      ],
    }),
    prisma.question.count({ where: listWhere }),
    prisma.question.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: baseWhere,
    }),
  ]);

  if (questions.length === 0) {
    return {
      items: [],
      total: 0,
      statusCounts: mapStatusCounts(groupedCounts),
    };
  }

  const loadAssets = createPageAssetLoader();
  const items = await Promise.all(
    questions.map((question) => toQuestionDto(question, loadAssets)),
  );

  return {
    items,
    total,
    statusCounts: mapStatusCounts(groupedCounts),
  };
};

const ensureEditableQuestions = async (
  questionIds: string[],
): Promise<string[]> => {
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: { id: true, isLockedAfterAdd: true },
  });

  if (questions.length === 0) {
    throw new ApiError(StatusCodes.NOT_FOUND, "No questions matched the provided identifiers");
  }

  if (questions.length !== questionIds.length) {
    throw new ApiError(StatusCodes.NOT_FOUND, "One or more questions could not be found");
  }

  const locked = questions.find((question) => question.isLockedAfterAdd);
  if (locked) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "A question has already been added to the Question Bank and cannot be modified",
    );
  }

  return questions.map((question) => question.id);
};

export const updateQuestion = async (
  questionId: string,
  payload: QuestionUpdatePayload,
  reviewer: AuthenticatedUser,
): Promise<QuestionReviewItemDto> => {
  const existing = await prisma.question.findUnique({
    where: { id: questionId },
    include: questionInclude,
  });

  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Question not found");
  }

  if (existing.isLockedAfterAdd) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "This question is locked after being published to the Question Bank",
    );
  }

  const updated = await prisma.question.update({
    where: { id: questionId },
    data: {
      stem: payload.stem,
      optionA: payload.optionA,
      optionB: payload.optionB,
      optionC: payload.optionC,
      optionD: payload.optionD,
      correctOption: payload.correctOption as OptionKey,
      explanation: payload.explanation,
      difficulty: payload.difficulty as DifficultyLevel,
      reviewedBy: reviewer.id,
    },
    include: questionInclude,
  });

  const loadAssets = createPageAssetLoader();
  return toQuestionDto(updated, loadAssets);
};

export const bulkUpdateQuestionStatus = async (
  payload: { questionIds: string[]; status: QuestionStatus },
  reviewer: AuthenticatedUser,
): Promise<QuestionBulkStatusResult> => {
  const editableIds = await ensureEditableQuestions(payload.questionIds);

  await prisma.question.updateMany({
    where: { id: { in: editableIds } },
    data: {
      status: payload.status as PrismaQuestionStatus,
      reviewedBy: reviewer.id,
    },
  });

  return { updatedIds: editableIds };
};

export const bulkDeleteQuestions = async (
  payload: { questionIds: string[] },
): Promise<QuestionBulkDeleteResult> => {
  const deletableIds = await ensureEditableQuestions(payload.questionIds);

  await prisma.question.deleteMany({
    where: { id: { in: deletableIds } },
  });

  return { deletedIds: deletableIds };
};

export const bulkPublishQuestions = async (
  payload: { questionIds: string[] },
  reviewer: AuthenticatedUser,
): Promise<QuestionBulkPublishResult> => {
  const questions = await prisma.question.findMany({
    where: { id: { in: payload.questionIds } },
    select: { id: true, status: true, isLockedAfterAdd: true },
  });

  if (questions.length === 0) {
    throw new ApiError(StatusCodes.NOT_FOUND, "No questions matched the provided identifiers");
  }

  if (questions.length !== payload.questionIds.length) {
    throw new ApiError(StatusCodes.NOT_FOUND, "One or more questions could not be found");
  }

  const nonApproved = questions.find((question) => question.status !== PrismaQuestionStatus.approved);
  if (nonApproved) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Only approved questions can be added to the Question Bank",
    );
  }

  const locked = questions.find((question) => question.isLockedAfterAdd);
  if (locked) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "A question is already published to the Question Bank",
    );
  }

  try {
    const questionIds = questions.map((question) => question.id);

    const questionBankEntryIds = await prisma.$transaction(async (tx) => {
      const createdIds: string[] = [];

      for (const questionId of questionIds) {
        const result = await tx.$queryRaw<{ publish_question: string }[]>`
          SELECT publish_question(${questionId}::uuid, ${reviewer.id}::uuid)
        `;

        const createdId = result[0]?.publish_question;
        if (!createdId) {
          throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to publish question");
        }

        createdIds.push(createdId);
      }

      await tx.question.updateMany({
        where: { id: { in: questionIds } },
        data: {
          status: PrismaQuestionStatus.approved,
          reviewedBy: reviewer.id,
        },
      });

      return createdIds;
    });

    return {
      publishedIds: questionIds,
      questionBankEntryIds,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      error instanceof Error ? error.message : "Failed to publish questions",
    );
  }
};

