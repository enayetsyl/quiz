import { apiClient, type QuizgenAxiosRequestConfig } from '@/lib/api-client';

import type { ApiSuccessResponse } from '@quizgen/shared';

import type { RotateTokenResponse } from '../types';

export const rotateApiToken = async () => {
  const response = await apiClient.post<ApiSuccessResponse<RotateTokenResponse>>(
    '/settings/rotate-api-token',
    undefined,
    {
      withSuccessToast: true,
      successToastMessage: 'A new API token has been generated'
    } as QuizgenAxiosRequestConfig
  );

  return response.data.data;
};
