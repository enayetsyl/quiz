export type UserRole = 'admin' | 'approver';

export type CurrentUser = {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
};
