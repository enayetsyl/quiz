export const appName = "NCTB Quiz Generator";

export type ApiSuccessResponse<T> = {
  success: true;
  message: string | null;
  data: T;
  meta: Record<string, unknown> | null;
};

export type ApiErrorResponse = {
  success: false;
  message: string;
  data: unknown | null;
  meta: Record<string, unknown> | null;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export type ApiResponsePayload<T> = {
  success: boolean;
  message?: string;
  data?: T;
  meta?: Record<string, unknown>;
};

export const isApiErrorResponse = <T>(
  response: ApiResponse<T>
): response is ApiErrorResponse => !response.success;

export type HealthCheckResponse = {
  status: "ok";
  timestamp: string;
  service: string;
  info?: Record<string, unknown>;
};

export type ChapterDto = {
  id: string;
  subjectId: string;
  name: string;
  ordinal: number;
  createdAt: string;
  updatedAt: string;
};

export type SubjectDto = {
  id: string;
  classId: number;
  name: string;
  code: string | null;
  createdAt: string;
  updatedAt: string;
  chapters: ChapterDto[];
};

export type ClassLevelDto = {
  id: number;
  displayName: string;
  subjects: SubjectDto[];
};

export type TaxonomyResponse = {
  classes: ClassLevelDto[];
};

export type UploadPageStatus = "pending" | "queued" | "generating" | "complete" | "failed";

export type UploadPageDto = {
  id: string;
  pageNumber: number;
  status: UploadPageStatus;
  pngUrl: string | null;
  thumbnailUrl: string | null;
  updatedAt: string;
};

export type UploadResponse = {
  id: string;
  classId: number;
  subjectId: string;
  chapterId: string;
  originalFilename: string;
  mimeType: string;
  pagesCount: number;
  createdAt: string;
  pdfUrl: string;
  pages: UploadPageDto[];
};

export type UploadSummaryDto = {
  id: string;
  chapterId: string;
  originalFilename: string;
  createdAt: string;
  pagesCount: number;
  completedPages: number;
  pdfUrl: string;
};

export type UploadListQuery = {
  chapterId: string;
};

export type GenerationAttemptDto = {
  id: string;
  attemptNo: number;
  model: string;
  promptVersion: string;
  isSuccess: boolean;
  errorMessage: string | null;
  requestExcerpt: string | null;
  responseExcerpt: string | null;
  createdAt: string;
};

export type GenerationPageDto = {
  id: string;
  pageNumber: number;
  status: UploadPageStatus;
  language: "bn" | "en" | null;
  lastGeneratedAt: string | null;
  questionCount: number;
  pngUrl: string | null;
  thumbnailUrl: string | null;
  attempts: GenerationAttemptDto[];
};

export type GenerationStatusCounts = {
  pending: number;
  queued: number;
  generating: number;
  complete: number;
  failed: number;
};

export type GenerationUploadOverview = {
  id: string;
  chapterId: string;
  originalFilename: string;
  createdAt: string;
  pagesCount: number;
  statusCounts: GenerationStatusCounts;
  pages: GenerationPageDto[];
};

export const formatDisplayDateTime = (
  date: Date,
  locale: string = "en-GB"
): string =>
  new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric"
  }).format(date);

export type QuestionStatus = "not_checked" | "approved" | "rejected" | "needs_fix";

export type QuestionDifficulty = "easy" | "medium" | "hard";

export type QuestionExportFilters = {
  classId?: number;
  subjectId?: string;
  chapterId?: string;
  pageNumber?: number;
  status?: QuestionStatus;
};

export type QuestionExportRow = {
  questionId: string;
  classId: number;
  subjectName: string;
  chapterName: string;
  pageNumber: number;
  language: string | null;
  difficulty: QuestionDifficulty | null;
  stem: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  explanation: string | null;
  status: QuestionStatus;
  createdAt: string;
  sourcePageImageUrl: string | null;
};

export type QuestionExportResponse = {
  items: QuestionExportRow[];
};

export type QuestionBankExportFilters = {
  classId?: number;
  subjectId?: string;
  chapterId?: string;
  pageNumber?: number;
};

export type QuestionBankExportRow = {
  questionBankId: string;
  subjectShortCode: string | null;
  sequenceNumber: number | null;
  classId: number;
  subjectName: string;
  chapterName: string;
  pageNumber: number | null;
  language: string | null;
  difficulty: QuestionDifficulty | null;
  stem: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  explanation: string | null;
  createdAt: string;
  sourcePageImageUrl: string | null;
};

export type QuestionBankExportResponse = {
  items: QuestionBankExportRow[];
};

export type InternalApprovedQuestionsQuery = QuestionExportFilters & {
  limit?: number;
  offset?: number;
};

export type InternalApprovedQuestionsResponse = {
  items: QuestionExportRow[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
};

export type QuestionOptionKey = "a" | "b" | "c" | "d";

export type QuestionBankEntryDto = {
  id: string;
  seqNo: number | null;
  subjShortCode: string | null;
  createdAt: string;
};

export type QuestionReviewItemDto = {
  id: string;
  pageId: string;
  pageNumber: number;
  pageImageUrl: string;
  pageThumbnailUrl: string;
  classId: number;
  subjectId: string;
  chapterId: string;
  status: QuestionStatus;
  difficulty: QuestionDifficulty;
  language: "bn" | "en";
  lineIndex: number;
  stem: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: QuestionOptionKey;
  explanation: string;
  isLockedAfterAdd: boolean;
  questionBankEntry: QuestionBankEntryDto | null;
  createdAt: string;
  updatedAt: string;
};

export type QuestionStatusCounts = Record<QuestionStatus, number>;

export type QuestionListResponse = {
  items: QuestionReviewItemDto[];
  total: number;
  statusCounts: QuestionStatusCounts;
};

export type QuestionListFilters = {
  classId?: number;
  subjectId?: string;
  chapterId?: string;
  pageId?: string;
  status?: QuestionStatus | "all";
};

export type QuestionUpdatePayload = {
  stem: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: QuestionOptionKey;
  explanation: string;
  difficulty: QuestionDifficulty;
};

export type QuestionBulkStatusPayload = {
  questionIds: string[];
  status: QuestionStatus;
};

export type QuestionBulkDeletePayload = {
  questionIds: string[];
};

export type QuestionBulkPublishPayload = {
  questionIds: string[];
};

export type QuestionBulkStatusResult = {
  updatedIds: string[];
};

export type QuestionBulkDeleteResult = {
  deletedIds: string[];
};

export type QuestionBulkPublishResult = {
  publishedIds: string[];
  questionBankEntryIds: string[];
};

