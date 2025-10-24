import { z } from "zod";

export const uploadMetadataSchema = z.object({
  classId: z.coerce.number().int().min(1, "Class is required"),
  subjectId: z.string().uuid("Subject selection invalid"),
  chapterId: z.string().uuid("Chapter selection invalid"),
});

export type UploadMetadataInput = z.infer<typeof uploadMetadataSchema>;

export const uploadListQuerySchema = z.object({
  chapterId: z.string().uuid("Chapter selection invalid"),
});

