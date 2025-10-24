import { z } from "zod";

export const uploadIdParamSchema = z.object({
  uploadId: z.string().uuid(),
});

export const pageIdParamSchema = z.object({
  pageId: z.string().uuid(),
});

export const generationOptionSchema = z.object({
  key: z.enum(["a", "b", "c", "d"]),
  text: z.string().min(1, "Option text is required"),
});

export const generationQuestionSchema = z
  .object({
    lineIndex: z.number().int().min(0),
    stem: z.string().min(1, "Question stem is required"),
    difficulty: z.enum(["easy", "medium", "hard"]),
    options: z.array(generationOptionSchema).length(4),
    correctOption: z.enum(["a", "b", "c", "d"]),
    explanation: z.string().min(1, "Explanation is required"),
  })
  .refine(
    (value) => value.options.some((option) => option.key === value.correctOption),
    {
      path: ["correctOption"],
      message: "Correct option must be one of the provided options",
    }
  )
  .refine(
    (value) => {
      const keys = value.options.map((option) => option.key);
      return new Set(keys).size === keys.length;
    },
    {
      path: ["options"],
      message: "Option keys must be unique",
    }
  );

export const generationResponseSchema = z.object({
  questions: z.array(generationQuestionSchema).min(1, "At least one question is required"),
  language: z.enum(["bn", "en"]).optional(),
  tokensIn: z.number().int().min(0).optional(),
  tokensOut: z.number().int().min(0).optional(),
});

export type GenerationQuestion = z.infer<typeof generationQuestionSchema>;

export type GenerationResponsePayload = z.infer<typeof generationResponseSchema>;
