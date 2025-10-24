import { apiClient, type QuizgenAxiosRequestConfig } from '@/lib/api-client';

import type { ApiSuccessResponse, GenerationUploadOverview } from '@quizgen/shared';

export const getGenerationOverview = async (uploadId: string): Promise<GenerationUploadOverview> => {
  const config: QuizgenAxiosRequestConfig = { withErrorToast: false };
  const response = await apiClient.get<ApiSuccessResponse<GenerationUploadOverview>>(
    `/generation/uploads/${uploadId}`,
    config,
  );

  return response.data.data;
};
