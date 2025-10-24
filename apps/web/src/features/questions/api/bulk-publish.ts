import { apiClient, type QuizgenAxiosRequestConfig } from '@/lib/api-client';

import type {
  ApiSuccessResponse,
  QuestionBulkPublishPayload,
  QuestionBulkPublishResult,
} from '@quizgen/shared';

export const bulkPublishQuestions = async (
  payload: QuestionBulkPublishPayload,
): Promise<QuestionBulkPublishResult> => {
  const config: QuizgenAxiosRequestConfig = {
    withSuccessToast: true,
    successToastMessage: 'Questions added to the Question Bank',
  };

  const response = await apiClient.post<ApiSuccessResponse<QuestionBulkPublishResult>>(
    '/questions/bulk/publish',
    payload,
    config,
  );

  return response.data.data;
};

