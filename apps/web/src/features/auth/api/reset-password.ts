import { apiClient, type QuizgenAxiosRequestConfig } from '@/lib/api-client';

import type { ApiSuccessResponse } from '@quizgen/shared';

export type ResetPasswordPayload = {
  token: string;
  password: string;
};

export const resetPassword = async (payload: ResetPasswordPayload) => {
  await apiClient.post<ApiSuccessResponse<null>>(
    '/auth/password/reset',
    payload,
    {
      withSuccessToast: true,
      successToastMessage: 'Password updated successfully.'
    } as QuizgenAxiosRequestConfig
  );
};
