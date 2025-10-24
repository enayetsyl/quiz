import type { UserRole } from '@/features/auth/types';

export type UserSummary = {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
};

export type CreateUserPayload = {
  email: string;
  password: string;
  role: UserRole;
};

export type UpdateUserPayload = {
  userId: string;
  role?: UserRole;
  isActive?: boolean;
  password?: string;
};
