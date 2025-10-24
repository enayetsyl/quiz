import { apiClient, type QuizgenAxiosRequestConfig } from '@/lib/api-client';

import type { ApiSuccessResponse } from '@quizgen/shared';

import type { AppSettings, UpdateSettingsPayload } from '../types';

export const updateSettings = async (payload: UpdateSettingsPayload) => {
  const response = await apiClient.put<ApiSuccessResponse<AppSettings>>(
    '/settings',
    payload,
    {
      withSuccessToast: true,
      successToastMessage: 'Settings updated successfully'
    } as QuizgenAxiosRequestConfig
  );

  return response.data.data;
};
