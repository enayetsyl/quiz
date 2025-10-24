'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  bulkDeleteQuestions,
  bulkPublishQuestions,
  bulkUpdateQuestionStatus,
  getQuestions,
  updateQuestion,
} from '../api';

import type {
  QuestionBulkDeletePayload,
  QuestionBulkPublishPayload,
  QuestionBulkStatusPayload,
  QuestionListFilters,
  QuestionListResponse,
  QuestionReviewItemDto,
  QuestionUpdatePayload,
} from '@quizgen/shared';

const questionsRootKey = ['questions'] as const;

const buildListKey = (filters: QuestionListFilters | null) =>
  [
    ...questionsRootKey,
    `class:${filters?.classId ?? 'all'}`,
    `subject:${filters?.subjectId ?? 'all'}`,
    `chapter:${filters?.chapterId ?? 'all'}`,
    `page:${filters?.pageId ?? 'all'}`,
    `status:${filters?.status ?? 'default'}`,
  ] as const;

export const useQuestionsQuery = (filters: QuestionListFilters | null) =>
  useQuery<QuestionListResponse>({
    queryKey: buildListKey(filters),
    queryFn: () => {
      if (!filters) {
        return Promise.resolve({ items: [], total: 0, statusCounts: {
          not_checked: 0,
          approved: 0,
          rejected: 0,
          needs_fix: 0,
        } });
      }

      return getQuestions(filters);
    },
    enabled: Boolean(filters),
    staleTime: 15_000,
  });

type UpdateQuestionVariables = {
  questionId: string;
  payload: QuestionUpdatePayload;
};

export const useUpdateQuestionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<QuestionReviewItemDto, unknown, UpdateQuestionVariables>({
    mutationFn: ({ questionId, payload }) => updateQuestion(questionId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: questionsRootKey });
    },
  });
};

export const useBulkStatusMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: QuestionBulkStatusPayload) => bulkUpdateQuestionStatus(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: questionsRootKey });
    },
  });
};

export const useBulkDeleteMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: QuestionBulkDeletePayload) => bulkDeleteQuestions(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: questionsRootKey });
    },
  });
};

export const useBulkPublishMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: QuestionBulkPublishPayload) => bulkPublishQuestions(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: questionsRootKey });
    },
  });
};

