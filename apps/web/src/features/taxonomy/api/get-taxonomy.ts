import { apiClient, type QuizgenAxiosRequestConfig } from '@/lib/api-client';

import type { ApiSuccessResponse, TaxonomyResponse } from '@quizgen/shared';

export const getTaxonomy = async (): Promise<TaxonomyResponse> => {
  const config: QuizgenAxiosRequestConfig = { withErrorToast: false };
  const response = await apiClient.get<ApiSuccessResponse<TaxonomyResponse>>(
    '/taxonomy',
    config
  );

  return response.data.data;
};
