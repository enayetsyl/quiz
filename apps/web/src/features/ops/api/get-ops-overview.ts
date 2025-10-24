import { apiClient, type QuizgenAxiosRequestConfig } from '@/lib/api-client';

import type { ApiSuccessResponse, OpsOverviewResponse } from '@quizgen/shared';

export const getOpsOverview = async (): Promise<OpsOverviewResponse> => {
  const response = await apiClient.get<ApiSuccessResponse<OpsOverviewResponse>>(
    '/ops/overview',
    { withErrorToast: true } as QuizgenAxiosRequestConfig
  );

  return response.data.data;
};
