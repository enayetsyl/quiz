import { apiClient, type QuizgenAxiosRequestConfig } from '@/lib/api-client';

import type { ApiSuccessResponse } from '@quizgen/shared';

import type { CurrentUser } from '../types';

export type LoginPayload = {
  email: string;
  password: string;
};

export const login = async (payload: LoginPayload) => {
  const response = await apiClient.post<ApiSuccessResponse<CurrentUser>>(
    '/auth/login',
    payload,
    {
      withSuccessToast: true,
      successToastMessage: 'Signed in successfully'
    } as QuizgenAxiosRequestConfig
  );

  return response.data.data;
};
