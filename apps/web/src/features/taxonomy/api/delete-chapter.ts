import { apiClient, type QuizgenAxiosRequestConfig } from '@/lib/api-client';

import type { ApiSuccessResponse } from '@quizgen/shared';

import type { DeleteChapterPayload } from '../types';

export const deleteChapter = async (payload: DeleteChapterPayload): Promise<void> => {
  const config: QuizgenAxiosRequestConfig = {
    withSuccessToast: 'Chapter removed'
  };

  await apiClient.delete<ApiSuccessResponse<{ id: string }>>(
    `/taxonomy/chapters/${payload.id}`,
    config
  );
};
