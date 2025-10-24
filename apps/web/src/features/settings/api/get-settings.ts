import { apiClient, type QuizgenAxiosRequestConfig } from '@/lib/api-client';

import type { ApiSuccessResponse } from '@quizgen/shared';

import type { AppSettings } from '../types';

export const getSettings = async () => {
  const response = await apiClient.get<ApiSuccessResponse<AppSettings>>(
    '/settings',
    { withErrorToast: false } as QuizgenAxiosRequestConfig
  );

  return response.data.data;
};
