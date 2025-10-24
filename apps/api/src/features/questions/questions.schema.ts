import { z } from "zod";

const questionStatusValues = ["not_checked", "approved", "rejected", "needs_fix"] as const;
const optionKeyValues = ["a", "b", "c", "d"] as const;
const difficultyValues = ["easy", "medium", "hard"] as const;

type QuestionStatusValue = (typeof questionStatusValues)[number];

const queryValueSchema = z
  .string()
  .or(z.array(z.string()))
  .optional()
  .transform((value) => {
    if (Array.isArray(value)) {
      return value[0];
    }
    return value ?? undefined;
  });

const optionalUuidFromQuery = queryValueSchema
  .refine((value) => !value || z.string().uuid().safeParse(value).success, {
    message: "Invalid identifier"
  })
  .transform((value) => value ?? undefined);

const optionalStatusFromQuery = queryValueSchema
  .refine((value) => !value || value === "all" || questionStatusValues.includes(value as QuestionStatusValue), {
    message: "Invalid question status"
  })
  .transform((value): QuestionStatusValue | "all" | undefined => {
    if (!value) {
      return undefined;
    }

    if (value === "all") {
      return "all";
    }

    return value as QuestionStatusValue;
  });

const optionalClassIdFromQuery = queryValueSchema
  .refine((value) => {
    if (!value) {
      return true;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0;
  }, { message: "classId must be a positive integer" })
  .transform((value) => {
    if (!value) {
      return undefined;
    }

    return Number.parseInt(value, 10);
  });

export const listQuestionsQuerySchema = z.object({
  classId: optionalClassIdFromQuery,
  subjectId: optionalUuidFromQuery,
  chapterId: optionalUuidFromQuery,
  pageId: optionalUuidFromQuery,
  status: optionalStatusFromQuery
});

export const questionIdSchema = z.string().uuid();

export const updateQuestionSchema = z.object({
  stem: z.string().trim().min(3).max(2000),
  optionA: z.string().trim().min(1).max(1000),
  optionB: z.string().trim().min(1).max(1000),
  optionC: z.string().trim().min(1).max(1000),
  optionD: z.string().trim().min(1).max(1000),
  correctOption: z.enum(optionKeyValues),
  explanation: z.string().trim().min(1).max(2000),
  difficulty: z.enum(difficultyValues)
});

export const bulkQuestionIdsSchema = z.object({
  questionIds: z.array(questionIdSchema).min(1)
});

export const bulkStatusSchema = bulkQuestionIdsSchema.extend({
  status: z.enum(questionStatusValues)
});

export const bulkPublishSchema = bulkQuestionIdsSchema;

