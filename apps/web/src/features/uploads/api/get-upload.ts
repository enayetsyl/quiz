import { apiClient, type QuizgenAxiosRequestConfig } from '@/lib/api-client';

import type { ApiSuccessResponse, UploadResponse } from '@quizgen/shared';

export const getUpload = async (uploadId: string): Promise<UploadResponse> => {
  const config: QuizgenAxiosRequestConfig = { withErrorToast: false };
  const response = await apiClient.get<ApiSuccessResponse<UploadResponse>>(
    `/uploads/${uploadId}`,
    config,
  );

  return response.data.data;
};

