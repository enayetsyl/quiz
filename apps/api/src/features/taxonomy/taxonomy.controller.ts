import type { Request, Response } from "express";

import { Prisma } from "@prisma/client";
import { StatusCodes } from "http-status-codes";

import { ApiError } from "@/lib/apiError";
import { catchAsync } from "@/lib/catchAsync";
import { sendResponse } from "@/lib/sendResponse";

import {
  createChapter,
  createClassLevel,
  createSubject,
  deleteChapter,
  deleteClassLevel,
  deleteSubject,
  getTaxonomy,
  updateChapter,
  updateClassLevel,
  updateSubject
} from "./taxonomy.service";
import {
  createChapterSchema,
  createClassLevelSchema,
  createSubjectSchema,
  updateChapterSchema,
  updateClassLevelSchema,
  updateSubjectSchema
} from "./taxonomy.schema";

const isPrismaKnownError = (error: unknown): error is Prisma.PrismaClientKnownRequestError =>
  error instanceof Prisma.PrismaClientKnownRequestError;

export const getTaxonomyTree = catchAsync(async (_req: Request, res: Response) => {
  const taxonomy = await getTaxonomy();

  return sendResponse(res, StatusCodes.OK, {
    success: true,
    message: "Taxonomy loaded",
    data: taxonomy
  });
});

export const createClassLevelHandler = catchAsync(async (req: Request, res: Response) => {
  const parsed = createClassLevelSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid class level payload");
  }

  try {
    const classLevel = await createClassLevel(parsed.data);

    return sendResponse(res, StatusCodes.CREATED, {
      success: true,
      message: "Class level created",
      data: classLevel
    });
  } catch (error) {
    if (isPrismaKnownError(error) && error.code === "P2002") {
      throw new ApiError(StatusCodes.BAD_REQUEST, "A class level with this id already exists");
    }

    throw error;
  }
});

export const updateClassLevelHandler = catchAsync(async (req: Request, res: Response) => {
  const parsed = updateClassLevelSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid class level payload");
  }

  const classLevelId = Number.parseInt(req.params.classLevelId ?? "", 10);
  if (Number.isNaN(classLevelId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "A valid class level id is required");
  }

  try {
    const classLevel = await updateClassLevel({ id: classLevelId, displayName: parsed.data.displayName });

    return sendResponse(res, StatusCodes.OK, {
      success: true,
      message: "Class level updated",
      data: classLevel
    });
  } catch (error) {
    if (isPrismaKnownError(error) && error.code === "P2025") {
      throw new ApiError(StatusCodes.NOT_FOUND, "Class level not found");
    }

    throw error;
  }
});

export const deleteClassLevelHandler = catchAsync(async (req: Request, res: Response) => {
  const classLevelId = Number.parseInt(req.params.classLevelId ?? "", 10);
  if (Number.isNaN(classLevelId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "A valid class level id is required");
  }

  try {
    await deleteClassLevel(classLevelId);

    return sendResponse(res, StatusCodes.OK, {
      success: true,
      message: "Class level removed",
      data: { id: classLevelId }
    });
  } catch (error) {
    if (isPrismaKnownError(error)) {
      if (error.code === "P2025") {
        throw new ApiError(StatusCodes.NOT_FOUND, "Class level not found");
      }
      if (error.code === "P2003") {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          "Class level cannot be deleted while subjects are attached"
        );
      }
    }

    throw error;
  }
});

export const createSubjectHandler = catchAsync(async (req: Request, res: Response) => {
  const parsed = createSubjectSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid subject payload");
  }

  try {
    const subject = await createSubject(parsed.data);

    return sendResponse(res, StatusCodes.CREATED, {
      success: true,
      message: "Subject created",
      data: subject
    });
  } catch (error) {
    if (isPrismaKnownError(error)) {
      if (error.code === "P2002") {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          "A subject with this name already exists for the selected class"
        );
      }
      if (error.code === "P2003") {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Class level does not exist");
      }
    }

    throw error;
  }
});

export const updateSubjectHandler = catchAsync(async (req: Request, res: Response) => {
  const parsed = updateSubjectSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid subject payload");
  }

  const subjectId = req.params.subjectId;
  if (!subjectId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Subject id is required");
  }

  try {
    const subject = await updateSubject({ id: subjectId, ...parsed.data });

    return sendResponse(res, StatusCodes.OK, {
      success: true,
      message: "Subject updated",
      data: subject
    });
  } catch (error) {
    if (isPrismaKnownError(error)) {
      if (error.code === "P2025") {
        throw new ApiError(StatusCodes.NOT_FOUND, "Subject not found");
      }
      if (error.code === "P2002") {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          "A subject with this name already exists for the selected class"
        );
      }
    }

    throw error;
  }
});

export const deleteSubjectHandler = catchAsync(async (req: Request, res: Response) => {
  const subjectId = req.params.subjectId;
  if (!subjectId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Subject id is required");
  }

  try {
    await deleteSubject(subjectId);

    return sendResponse(res, StatusCodes.OK, {
      success: true,
      message: "Subject removed",
      data: { id: subjectId }
    });
  } catch (error) {
    if (isPrismaKnownError(error)) {
      if (error.code === "P2025") {
        throw new ApiError(StatusCodes.NOT_FOUND, "Subject not found");
      }
      if (error.code === "P2003") {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Subject cannot be removed while chapters exist");
      }
    }

    throw error;
  }
});

export const createChapterHandler = catchAsync(async (req: Request, res: Response) => {
  const parsed = createChapterSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid chapter payload");
  }

  try {
    const chapter = await createChapter(parsed.data);

    return sendResponse(res, StatusCodes.CREATED, {
      success: true,
      message: "Chapter created",
      data: chapter
    });
  } catch (error) {
    if (isPrismaKnownError(error)) {
      if (error.code === "P2002") {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          "A chapter with this ordinal already exists for the subject"
        );
      }
      if (error.code === "P2003") {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Subject does not exist");
      }
    }

    throw error;
  }
});

export const updateChapterHandler = catchAsync(async (req: Request, res: Response) => {
  const parsed = updateChapterSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid chapter payload");
  }

  const chapterId = req.params.chapterId;
  if (!chapterId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Chapter id is required");
  }

  try {
    const chapter = await updateChapter({ id: chapterId, ...parsed.data });

    return sendResponse(res, StatusCodes.OK, {
      success: true,
      message: "Chapter updated",
      data: chapter
    });
  } catch (error) {
    if (isPrismaKnownError(error)) {
      if (error.code === "P2025") {
        throw new ApiError(StatusCodes.NOT_FOUND, "Chapter not found");
      }
      if (error.code === "P2002") {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          "A chapter with this ordinal already exists for the subject"
        );
      }
    }

    throw error;
  }
});

export const deleteChapterHandler = catchAsync(async (req: Request, res: Response) => {
  const chapterId = req.params.chapterId;
  if (!chapterId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Chapter id is required");
  }

  try {
    await deleteChapter(chapterId);

    return sendResponse(res, StatusCodes.OK, {
      success: true,
      message: "Chapter removed",
      data: { id: chapterId }
    });
  } catch (error) {
    if (isPrismaKnownError(error)) {
      if (error.code === "P2025") {
        throw new ApiError(StatusCodes.NOT_FOUND, "Chapter not found");
      }
    }

    throw error;
  }
});
