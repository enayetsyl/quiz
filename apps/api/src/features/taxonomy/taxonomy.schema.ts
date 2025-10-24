import { z } from "zod";

export const createClassLevelSchema = z.object({
  id: z.number().int().min(1).max(20),
  displayName: z.string().trim().min(2).max(100)
});

export const updateClassLevelSchema = z.object({
  displayName: z.string().trim().min(2).max(100)
});

const subjectCodeSchema = z
  .string()
  .regex(/^[A-Z]{2}$/)
  .transform((value) => value.toUpperCase());

export const createSubjectSchema = z.object({
  classId: z.number().int().min(1).max(20),
  name: z.string().trim().min(2).max(150),
  code: subjectCodeSchema.optional().nullable()
});

export const updateSubjectSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  code: subjectCodeSchema.optional().nullable()
});

export const createChapterSchema = z.object({
  subjectId: z.string().uuid(),
  name: z.string().trim().min(2).max(200),
  ordinal: z.number().int().min(1).max(500)
});

export const updateChapterSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  ordinal: z.number().int().min(1).max(500).optional()
});
