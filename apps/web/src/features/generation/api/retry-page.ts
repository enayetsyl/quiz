import { apiClient, type QuizgenAxiosRequestConfig } from '@/lib/api-client';

import type { ApiSuccessResponse, GenerationUploadOverview } from '@quizgen/shared';

export const retryPageGeneration = async (pageId: string): Promise<GenerationUploadOverview> => {
  const config: QuizgenAxiosRequestConfig = {
    withSuccessToast: 'Page queued for retry.',
  };

  const response = await apiClient.post<ApiSuccessResponse<GenerationUploadOverview>>(
    `/generation/pages/${pageId}/retry`,
    undefined,
    config,
  );

  return response.data.data;
};
