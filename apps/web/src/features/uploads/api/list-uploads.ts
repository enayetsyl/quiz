import { apiClient, type QuizgenAxiosRequestConfig } from '@/lib/api-client';

import type { ApiSuccessResponse, UploadSummaryDto } from '@quizgen/shared';

type UploadListResponse = {
  uploads: UploadSummaryDto[];
};

export const listUploadsByChapter = async (chapterId: string): Promise<UploadSummaryDto[]> => {
  const config: QuizgenAxiosRequestConfig = { params: { chapterId }, withErrorToast: false };
  const response = await apiClient.get<ApiSuccessResponse<UploadListResponse>>('/uploads', config);

  return response.data.data.uploads;
};

