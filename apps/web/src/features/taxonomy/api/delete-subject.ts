import { apiClient, type QuizgenAxiosRequestConfig } from '@/lib/api-client';

import type { ApiSuccessResponse } from '@quizgen/shared';

import type { DeleteSubjectPayload } from '../types';

export const deleteSubject = async (payload: DeleteSubjectPayload): Promise<void> => {
  const config: QuizgenAxiosRequestConfig = {
    withSuccessToast: 'Subject removed'
  };

  await apiClient.delete<ApiSuccessResponse<{ id: string }>>(
    `/taxonomy/subjects/${payload.id}`,
    config
  );
};
