import { apiClient, type QuizgenAxiosRequestConfig } from '@/lib/api-client';

import type {
  ApiSuccessResponse,
  QuestionListFilters,
  QuestionListResponse,
} from '@quizgen/shared';

const buildQueryParams = (filters: QuestionListFilters): Record<string, string> => {
  const params: Record<string, string> = {};

  if (typeof filters.classId === 'number') {
    params.classId = filters.classId.toString();
  }

  if (filters.subjectId) {
    params.subjectId = filters.subjectId;
  }

  if (filters.chapterId) {
    params.chapterId = filters.chapterId;
  }

  if (filters.pageId) {
    params.pageId = filters.pageId;
  }

  if (filters.status && filters.status !== 'all') {
    params.status = filters.status;
  } else if (filters.status === 'all') {
    params.status = 'all';
  }

  return params;
};

export const getQuestions = async (
  filters: QuestionListFilters,
): Promise<QuestionListResponse> => {
  const config: QuizgenAxiosRequestConfig = {
    withErrorToast: false,
    params: buildQueryParams(filters),
  };

  const response = await apiClient.get<ApiSuccessResponse<QuestionListResponse>>(
    '/questions',
    config,
  );

  return response.data.data;
};

