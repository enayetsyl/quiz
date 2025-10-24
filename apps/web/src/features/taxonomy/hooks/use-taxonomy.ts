'use client';

import { useCallback, useState } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { createChapter } from '../api/create-chapter';
import { createSubject } from '../api/create-subject';
import { deleteChapter } from '../api/delete-chapter';
import { deleteSubject } from '../api/delete-subject';
import { getTaxonomy } from '../api/get-taxonomy';
import { updateChapter } from '../api/update-chapter';
import { updateSubject } from '../api/update-subject';
import type {
  CreateChapterPayload,
  CreateSubjectPayload,
  DeleteChapterPayload,
  DeleteSubjectPayload,
  TaxonomyData,
  UpdateChapterPayload,
  UpdateSubjectPayload
} from '../types';

const taxonomyQueryKey = ['taxonomy'];

export const useTaxonomyQuery = () =>
  useQuery({
    queryKey: taxonomyQueryKey,
    queryFn: getTaxonomy,
    staleTime: 60_000
  });

const useInvalidateTaxonomy = () => {
  const queryClient = useQueryClient();

  return useCallback(() => queryClient.fetchQuery(taxonomyQueryKey, getTaxonomy), [queryClient]);
};

export const useCreateSubjectMutation = () => {
  const invalidate = useInvalidateTaxonomy();
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(
    async (payload: CreateSubjectPayload) => {
      setIsPending(true);
      try {
        const subject = await createSubject(payload);
        await invalidate();
        return subject;
      } finally {
        setIsPending(false);
      }
    },
    [invalidate]
  );

  return { mutateAsync, isPending };
};

export const useUpdateSubjectMutation = () => {
  const invalidate = useInvalidateTaxonomy();
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(
    async (payload: UpdateSubjectPayload) => {
      setIsPending(true);
      try {
        const subject = await updateSubject(payload);
        await invalidate();
        return subject;
      } finally {
        setIsPending(false);
      }
    },
    [invalidate]
  );

  return { mutateAsync, isPending };
};

export const useDeleteSubjectMutation = () => {
  const invalidate = useInvalidateTaxonomy();
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(
    async (payload: DeleteSubjectPayload) => {
      setIsPending(true);
      try {
        await deleteSubject(payload);
        await invalidate();
      } finally {
        setIsPending(false);
      }
    },
    [invalidate]
  );

  return { mutateAsync, isPending };
};

export const useCreateChapterMutation = () => {
  const invalidate = useInvalidateTaxonomy();
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(
    async (payload: CreateChapterPayload) => {
      setIsPending(true);
      try {
        const chapter = await createChapter(payload);
        await invalidate();
        return chapter;
      } finally {
        setIsPending(false);
      }
    },
    [invalidate]
  );

  return { mutateAsync, isPending };
};

export const useUpdateChapterMutation = () => {
  const invalidate = useInvalidateTaxonomy();
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(
    async (payload: UpdateChapterPayload) => {
      setIsPending(true);
      try {
        const chapter = await updateChapter(payload);
        await invalidate();
        return chapter;
      } finally {
        setIsPending(false);
      }
    },
    [invalidate]
  );

  return { mutateAsync, isPending };
};

export const useDeleteChapterMutation = () => {
  const invalidate = useInvalidateTaxonomy();
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(
    async (payload: DeleteChapterPayload) => {
      setIsPending(true);
      try {
        await deleteChapter(payload);
        await invalidate();
      } finally {
        setIsPending(false);
      }
    },
    [invalidate]
  );

  return { mutateAsync, isPending };
};

export type TaxonomyQueryResult = {
  data?: TaxonomyData;
  isLoading: boolean;
};
