import { apiClient, type QuizgenAxiosRequestConfig } from '@/lib/api-client';

import type {
  ApiSuccessResponse,
  QuestionBulkStatusPayload,
  QuestionBulkStatusResult,
} from '@quizgen/shared';

export const bulkUpdateQuestionStatus = async (
  payload: QuestionBulkStatusPayload,
): Promise<QuestionBulkStatusResult> => {
  const config: QuizgenAxiosRequestConfig = {
    withSuccessToast: true,
    successToastMessage: 'Status updated',
  };

  const response = await apiClient.post<ApiSuccessResponse<QuestionBulkStatusResult>>(
    '/questions/bulk/status',
    payload,
    config,
  );

  return response.data.data;
};

