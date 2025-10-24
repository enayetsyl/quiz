import { apiClient, type QuizgenAxiosRequestConfig } from '@/lib/api-client';

import type { ApiSuccessResponse, GenerationUploadOverview } from '@quizgen/shared';

export const startGeneration = async (uploadId: string): Promise<GenerationUploadOverview> => {
  const config: QuizgenAxiosRequestConfig = {
    withSuccessToast: true,
    successToastMessage: 'Generation started successfully.',
  };

  const response = await apiClient.post<ApiSuccessResponse<GenerationUploadOverview>>(
    `/generation/uploads/${uploadId}/start`,
    undefined,
    config,
  );

  return response.data.data;
};
