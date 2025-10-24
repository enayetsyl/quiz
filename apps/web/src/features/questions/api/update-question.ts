import { apiClient, type QuizgenAxiosRequestConfig } from '@/lib/api-client';

import type {
  ApiSuccessResponse,
  QuestionReviewItemDto,
  QuestionUpdatePayload,
} from '@quizgen/shared';

export const updateQuestion = async (
  questionId: string,
  payload: QuestionUpdatePayload,
): Promise<QuestionReviewItemDto> => {
  const config: QuizgenAxiosRequestConfig = {
    withSuccessToast: true,
    successToastMessage: 'Question saved',
  };

  const response = await apiClient.patch<ApiSuccessResponse<QuestionReviewItemDto>>(
    `/questions/${questionId}`,
    payload,
    config,
  );

  return response.data.data;
};

