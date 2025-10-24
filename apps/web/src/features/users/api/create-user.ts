import { apiClient, type QuizgenAxiosRequestConfig } from '@/lib/api-client';

import type { ApiSuccessResponse } from '@quizgen/shared';

import type { CreateUserPayload, UserSummary } from '../types';

export const createUser = async (payload: CreateUserPayload) => {
  const response = await apiClient.post<ApiSuccessResponse<UserSummary>>(
    '/users',
    payload,
    {
      withSuccessToast: true,
      successToastMessage: 'User created successfully'
    } as QuizgenAxiosRequestConfig
  );

  return response.data.data;
};
