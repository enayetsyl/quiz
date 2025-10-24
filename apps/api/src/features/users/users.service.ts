import { Prisma, UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/utils/password";

export type UserSummary = {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
};

const selectUserSummary: Prisma.UserSelect = {
  id: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true
};

export const listUsers = async (): Promise<UserSummary[]> => {
  const users = await prisma.user.findMany({
    select: selectUserSummary,
    orderBy: { createdAt: "asc" }
  });

  return users.map((user) => ({
    id: user.id,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt
  }));
};

type CreateUserParams = {
  email: string;
  password: string;
  role: UserRole;
};

export const createUser = async ({ email, password, role }: CreateUserParams): Promise<UserSummary> => {
  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash: hashedPassword,
      role,
      isActive: true
    },
    select: selectUserSummary
  });

  return user;
};

type UpdateUserParams = {
  id: string;
  role?: UserRole;
  isActive?: boolean;
  password?: string;
};

export const updateUser = async ({ id, role, isActive, password }: UpdateUserParams): Promise<UserSummary> => {
  const data: Prisma.UserUpdateInput = {};
  if (role) {
    data.role = role;
  }
  if (typeof isActive === "boolean") {
    data.isActive = isActive;
  }
  if (password) {
    data.passwordHash = await hashPassword(password);
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: selectUserSummary
  });

  return user;
};
