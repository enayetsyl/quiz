import { apiClient, type QuizgenAxiosRequestConfig } from '@/lib/api-client';

import type { ApiSuccessResponse, SubjectDto } from '@quizgen/shared';

import type { CreateSubjectPayload } from '../types';

export const createSubject = async (payload: CreateSubjectPayload): Promise<SubjectDto> => {
  const config: QuizgenAxiosRequestConfig<CreateSubjectPayload> = {
    withSuccessToast: 'Subject created successfully'
  };
  const response = await apiClient.post<
    ApiSuccessResponse<SubjectDto>,
    CreateSubjectPayload
  >('/taxonomy/subjects', payload, config);

  return response.data.data;
};
