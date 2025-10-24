import { apiClient, type QuizgenAxiosRequestConfig } from '@/lib/api-client';

import type { ApiSuccessResponse } from '@quizgen/shared';

import type { UpdateUserPayload, UserSummary } from '../types';

export const updateUser = async ({ userId, ...payload }: UpdateUserPayload) => {
  const response = await apiClient.patch<ApiSuccessResponse<UserSummary>>(
    `/users/${userId}`,
    payload,
    {
      withSuccessToast: true,
      successToastMessage: 'User updated successfully'
    } as QuizgenAxiosRequestConfig
  );

  return response.data.data;
};
