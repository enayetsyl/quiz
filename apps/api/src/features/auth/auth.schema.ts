import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email()
});

export const passwordResetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8)
});
