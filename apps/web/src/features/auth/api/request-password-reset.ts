import { apiClient, type QuizgenAxiosRequestConfig } from '@/lib/api-client';

import type { ApiSuccessResponse } from '@quizgen/shared';

export type RequestPasswordResetPayload = {
  email: string;
};

type RequestPasswordResetResponse = {
  token: string | null;
} | null;

export const requestPasswordReset = async (payload: RequestPasswordResetPayload) => {
  const response = await apiClient.post<ApiSuccessResponse<RequestPasswordResetResponse>>(
    '/auth/password/request',
    payload,
    {
      withSuccessToast: true,
      successToastMessage: 'If the account is active, an email has been sent.'
    } as QuizgenAxiosRequestConfig
  );

  return response.data.data;
};
