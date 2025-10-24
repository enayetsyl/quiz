import { apiClient, type QuizgenAxiosRequestConfig } from '@/lib/api-client';

import type { ApiSuccessResponse } from '@quizgen/shared';

import type { UserSummary } from '../types';

export const listUsers = async () => {
  const response = await apiClient.get<ApiSuccessResponse<UserSummary[]>>(
    '/users',
    { withErrorToast: false } as QuizgenAxiosRequestConfig
  );

  return response.data.data;
};
