import type {
  ChapterDto,
  ClassLevelDto,
  SubjectDto,
  TaxonomyResponse
} from '@quizgen/shared';

export type TaxonomyData = TaxonomyResponse;

export type ClassLevelInfo = ClassLevelDto;
export type SubjectInfo = SubjectDto;
export type ChapterInfo = ChapterDto;

export type CreateSubjectPayload = {
  classId: number;
  name: string;
  code?: string | null;
};

export type UpdateSubjectPayload = {
  id: string;
  name?: string;
  code?: string | null;
};

export type DeleteSubjectPayload = {
  id: string;
};

export type CreateChapterPayload = {
  subjectId: string;
  name: string;
  ordinal: number;
};

export type UpdateChapterPayload = {
  id: string;
  name?: string;
  ordinal?: number;
};

export type DeleteChapterPayload = {
  id: string;
};
