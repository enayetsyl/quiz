'use client';

import { useMemo } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useCallback, useState } from 'react';

import { createUpload, type CreateUploadPayload } from '../api/create-upload';
import { getUpload } from '../api/get-upload';
import { listUploadsByChapter } from '../api/list-uploads';

import type { UploadResponse, UploadSummaryDto } from '@quizgen/shared';

const uploadsKeys = {
  detail: (uploadId: string) => ['uploads', 'detail', uploadId] as const,
  chapter: (chapterId: string) => ['uploads', 'chapter', chapterId] as const,
};

export const useUploadDetailQuery = (uploadId: string | null) =>
  useQuery<UploadResponse | undefined>({
    queryKey: uploadsKeys.detail(uploadId ?? 'none'),
    queryFn: () => (uploadId ? getUpload(uploadId) : Promise.resolve(undefined)),
    staleTime: 5_000,
    retry: 0,
  });

export const useChapterUploadsQuery = (chapterId: string | null) =>
  useQuery<UploadSummaryDto[]>({
    queryKey: uploadsKeys.chapter(chapterId ?? 'none'),
    queryFn: () => (chapterId ? listUploadsByChapter(chapterId) : Promise.resolve([])),
    refetchOnWindowFocus: false,
  });

export const useCreateUploadMutation = () => {
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(
    async (payload: CreateUploadPayload) => {
      setIsPending(true);
      try {
        const upload = await createUpload(payload);
        await Promise.all([
          queryClient.fetchQuery(uploadsKeys.chapter(upload.chapterId), () =>
            listUploadsByChapter(upload.chapterId),
          ),
          queryClient.fetchQuery(uploadsKeys.detail(upload.id), () => getUpload(upload.id)),
        ]);
        return upload;
      } finally {
        setIsPending(false);
      }
    },
    [queryClient],
  );

  return { mutateAsync, isPending };
};

export const useRecentUpload = (
  uploads: UploadSummaryDto[] | undefined,
  currentUploadId: string | null,
) =>
  useMemo(() => {
    if (currentUploadId) {
      return uploads?.find((item) => item.id === currentUploadId) ?? null;
    }

    return uploads?.[0] ?? null;
  }, [uploads, currentUploadId]);

