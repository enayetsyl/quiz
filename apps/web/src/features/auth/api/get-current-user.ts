import { apiClient, type QuizgenAxiosRequestConfig } from '@/lib/api-client';

import type { ApiSuccessResponse } from '@quizgen/shared';

import type { CurrentUser } from '../types';

export const getCurrentUser = async () => {
  try {
    const response = await apiClient.get<ApiSuccessResponse<CurrentUser>>(
      '/auth/me',
      { withErrorToast: false } as QuizgenAxiosRequestConfig
    );

    return response.data.data;
  } catch (error) {
    const maybeResponse = (error as { response?: { status?: number } }).response;
    if (maybeResponse?.status === 401) {
      return null;
    }

    throw error;
  }
};
