import { apiClient, type QuizgenAxiosRequestConfig } from '@/lib/api-client';

import type { ApiSuccessResponse, ChapterDto } from '@quizgen/shared';

import type { UpdateChapterPayload } from '../types';

export const updateChapter = async (payload: UpdateChapterPayload): Promise<ChapterDto> => {
  const { id, ...data } = payload;
  const config: QuizgenAxiosRequestConfig<UpdateChapterPayload> = {
    withSuccessToast: 'Chapter updated successfully'
  };
  const response = await apiClient.patch<
    ApiSuccessResponse<ChapterDto>,
    UpdateChapterPayload
  >(`/taxonomy/chapters/${id}`, data, config);

  return response.data.data;
};
