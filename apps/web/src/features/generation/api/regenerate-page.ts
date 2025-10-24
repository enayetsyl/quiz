import { apiClient, type QuizgenAxiosRequestConfig } from '@/lib/api-client';

import type { ApiSuccessResponse, GenerationUploadOverview } from '@quizgen/shared';

export const regeneratePageGeneration = async (pageId: string): Promise<GenerationUploadOverview> => {
  const config: QuizgenAxiosRequestConfig = {
    withSuccessToast: 'Page regeneration scheduled.',
  };

  const response = await apiClient.post<ApiSuccessResponse<GenerationUploadOverview>>(
    `/generation/pages/${pageId}/regenerate`,
    undefined,
    config,
  );

  return response.data.data;
};
