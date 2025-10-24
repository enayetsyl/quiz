import type { AuthenticatedUser } from "@/features/auth/auth.service";

declare global {
  namespace Express {
    interface Locals {
      authUser?: AuthenticatedUser;
    }
  }
}

export {};
