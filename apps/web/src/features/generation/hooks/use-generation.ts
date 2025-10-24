'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  regeneratePageGeneration,
  retryPageGeneration,
  startGeneration,
} from '../api';
import { getGenerationOverview } from '../api/get-generation-overview';

import type { GenerationUploadOverview } from '@quizgen/shared';

const generationKeys = {
  upload: (uploadId: string) => ['generation', 'upload', uploadId] as const,
};

export const useGenerationOverviewQuery = (uploadId: string | null) =>
  useQuery<GenerationUploadOverview | undefined>({
    queryKey: generationKeys.upload(uploadId ?? 'none'),
    queryFn: () => (uploadId ? getGenerationOverview(uploadId) : Promise.resolve(undefined)),
    enabled: Boolean(uploadId),
    staleTime: 5_000,
  });

export const useStartGenerationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uploadId: string) => startGeneration(uploadId),
    onSuccess: (data) => {
      void queryClient.setQueryData(generationKeys.upload(data.id), data);
    },
  });
};

export const useRetryPageMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pageId: string) => retryPageGeneration(pageId),
    onSuccess: (data) => {
      void queryClient.setQueryData(generationKeys.upload(data.id), data);
    },
  });
};

export const useRegeneratePageMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pageId: string) => regeneratePageGeneration(pageId),
    onSuccess: (data) => {
      void queryClient.setQueryData(generationKeys.upload(data.id), data);
    },
  });
};
