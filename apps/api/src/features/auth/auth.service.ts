import { randomBytes, createHash } from "node:crypto";

import { UserRole } from "@prisma/client";

import { env } from "@/config";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/utils/password";
import { createAuthToken } from "@/utils/token";

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: Date | null;
};

type AuthenticationResult = {
  token: string;
  user: AuthenticatedUser;
};

const sanitizeUser = (user: {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: Date | null;
}): AuthenticatedUser => ({
  id: user.id,
  email: user.email,
  role: user.role,
  isActive: user.isActive,
  lastLoginAt: user.lastLoginAt
});

export const authenticateWithPassword = async (email: string, password: string): Promise<AuthenticationResult | null> => {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });

  if (!user || !user.isActive) {
    return null;
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    return null;
  }

  const loginTimestamp = new Date();

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: loginTimestamp }
  });

  const token = createAuthToken({ userId: user.id, role: user.role });

  return {
    token,
    user: sanitizeUser({
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: loginTimestamp
    })
  };
};

export const getUserById = async (id: string): Promise<AuthenticatedUser | null> => {
  const user = await prisma.user.findUnique({
    where: { id }
  });

  if (!user || !user.isActive) {
    return null;
  }

  return sanitizeUser({
    id: user.id,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt
  });
};

const createHashedToken = (length = 48) => {
  const buffer = randomBytes(length);
  const token = buffer.toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");

  return { token, tokenHash };
};

export const createPasswordResetRequest = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  if (!user || !user.isActive) {
    return { token: null };
  }

  const { token, tokenHash } = createHashedToken();
  const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt
    }
  });

  return { token, user };
};

export const resetPasswordWithToken = async (token: string, newPassword: string) => {
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const resetToken = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: new Date() }
    },
    include: {
      user: true
    }
  });

  if (!resetToken || !resetToken.user.isActive) {
    return false;
  }

  const newHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash: newHash,
        updatedAt: new Date()
      }
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: {
        usedAt: new Date()
      }
    })
  ]);

  return true;
};
