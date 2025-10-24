import type { Request, Response } from "express";

import { Prisma } from "@prisma/client";
import { StatusCodes } from "http-status-codes";

import { ApiError } from "@/lib/apiError";
import { catchAsync } from "@/lib/catchAsync";
import { sendResponse } from "@/lib/sendResponse";

import { createUser, listUsers, updateUser } from "./users.service";
import { createUserSchema, updateUserSchema } from "./users.schema";

export const getUsers = catchAsync(async (_req: Request, res: Response) => {
  const users = await listUsers();

  return sendResponse(res, StatusCodes.OK, {
    success: true,
    message: "Users loaded",
    data: users
  });
});

export const createNewUser = catchAsync(async (req: Request, res: Response) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid user payload");
  }

  try {
    const user = await createUser(parsed.data);

    return sendResponse(res, StatusCodes.CREATED, {
      success: true,
      message: "User created",
      data: user
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ApiError(StatusCodes.BAD_REQUEST, "A user with this email already exists");
    }

    throw error;
  }
});

export const updateExistingUser = catchAsync(async (req: Request, res: Response) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid update payload");
  }

  const userId = req.params.userId;
  if (!userId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User id is required");
  }

  try {
    const user = await updateUser({ id: userId, ...parsed.data });

    return sendResponse(res, StatusCodes.OK, {
      success: true,
      message: "User updated",
      data: user
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
    }

    throw error;
  }
});
