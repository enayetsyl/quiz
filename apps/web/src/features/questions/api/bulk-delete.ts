import { apiClient, type QuizgenAxiosRequestConfig } from '@/lib/api-client';

import type {
  ApiSuccessResponse,
  QuestionBulkDeletePayload,
  QuestionBulkDeleteResult,
} from '@quizgen/shared';

export const bulkDeleteQuestions = async (
  payload: QuestionBulkDeletePayload,
): Promise<QuestionBulkDeleteResult> => {
  const config: QuizgenAxiosRequestConfig = {
    withSuccessToast: true,
    successToastMessage: 'Questions deleted',
  };

  const response = await apiClient.post<ApiSuccessResponse<QuestionBulkDeleteResult>>(
    '/questions/bulk/delete',
    payload,
    config,
  );

  return response.data.data;
};

