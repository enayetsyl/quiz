import { apiClient, type QuizgenAxiosRequestConfig } from '@/lib/api-client';

import type { ApiSuccessResponse, ChapterDto } from '@quizgen/shared';

import type { CreateChapterPayload } from '../types';

export const createChapter = async (payload: CreateChapterPayload): Promise<ChapterDto> => {
  const config: QuizgenAxiosRequestConfig<CreateChapterPayload> = {
    withSuccessToast: 'Chapter created successfully'
  };
  const response = await apiClient.post<
    ApiSuccessResponse<ChapterDto>,
    CreateChapterPayload
  >('/taxonomy/chapters', payload, config);

  return response.data.data;
};
