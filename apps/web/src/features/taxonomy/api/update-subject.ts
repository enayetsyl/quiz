import { apiClient, type QuizgenAxiosRequestConfig } from '@/lib/api-client';

import type { ApiSuccessResponse, SubjectDto } from '@quizgen/shared';

import type { UpdateSubjectPayload } from '../types';

export const updateSubject = async (payload: UpdateSubjectPayload): Promise<SubjectDto> => {
  const { id, ...data } = payload;
  const config: QuizgenAxiosRequestConfig<UpdateSubjectPayload> = {
    withSuccessToast: 'Subject updated successfully'
  };
  const response = await apiClient.patch<
    ApiSuccessResponse<SubjectDto>,
    UpdateSubjectPayload
  >(`/taxonomy/subjects/${id}`, data, config);

  return response.data.data;
};
