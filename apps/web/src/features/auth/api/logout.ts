import { apiClient, type QuizgenAxiosRequestConfig } from '@/lib/api-client';

import type { ApiSuccessResponse } from '@quizgen/shared';

export const logout = async () => {
  await apiClient.post<ApiSuccessResponse<null>>(
    '/auth/logout',
    undefined,
    {
      withSuccessToast: true,
      successToastMessage: 'Signed out'
    } as QuizgenAxiosRequestConfig
  );
};
