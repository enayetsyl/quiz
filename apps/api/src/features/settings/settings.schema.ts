import { z } from "zod";

export const updateSettingsSchema = z.object({
  rpmCap: z.number().int().positive().max(1000).optional(),
  workerConcurrency: z.number().int().positive().max(50).optional(),
  queueProvider: z.string().min(3).max(50).optional(),
  rateLimitSafetyFactor: z.number().positive().max(1).optional(),
  tokenEstimateInitial: z.number().int().positive().max(100_000).optional()
});
