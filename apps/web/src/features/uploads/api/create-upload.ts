import { apiClient, type QuizgenAxiosRequestConfig } from '@/lib/api-client';

import type { ApiSuccessResponse, UploadResponse } from '@quizgen/shared';

export type CreateUploadPayload = {
  classId: number;
  subjectId: string;
  chapterId: string;
  file: File;
};

export const createUpload = async (payload: CreateUploadPayload): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('classId', String(payload.classId));
  formData.append('subjectId', payload.subjectId);
  formData.append('chapterId', payload.chapterId);
  formData.append('file', payload.file);

  const config: QuizgenAxiosRequestConfig<FormData> = {
    withSuccessToast: 'Upload queued for rasterization',
    withErrorToast: true,
  };

  const response = await apiClient.post<ApiSuccessResponse<UploadResponse>, FormData>(
    '/uploads',
    formData,
    config,
  );

  return response.data.data;
};

