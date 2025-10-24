import { z } from "zod";

const baseFilters = z.object({
  classId: z.coerce.number().int().min(1).optional(),
  subjectId: z.string().uuid().optional(),
  chapterId: z.string().uuid().optional(),
  pageNumber: z.coerce.number().int().min(1).optional()
});

export const exportFormatSchema = z.enum(["csv", "json"]);

export const questionExportQuerySchema = baseFilters
  .extend({
    status: z.enum(["not_checked", "approved", "rejected", "needs_fix"]).optional(),
    format: exportFormatSchema.default("json")
  })
  .strict();

export const questionBankExportQuerySchema = baseFilters
  .extend({
    format: exportFormatSchema.default("json")
  })
  .strict();

export const internalApprovedQuerySchema = baseFilters
  .extend({
    limit: z.coerce.number().int().min(1).max(1000).default(100),
    offset: z.coerce.number().int().min(0).default(0)
  })
  .strict();

export type QuestionExportQuery = z.infer<typeof questionExportQuerySchema>;
export type QuestionBankExportQuery = z.infer<typeof questionBankExportQuerySchema>;
export type InternalApprovedQuery = z.infer<typeof internalApprovedQuerySchema>;
