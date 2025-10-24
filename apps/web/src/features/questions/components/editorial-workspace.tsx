'use client';

import { useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { useTaxonomyQuery } from '@/features/taxonomy/hooks/use-taxonomy';

import {
  useBulkDeleteMutation,
  useBulkPublishMutation,
  useBulkStatusMutation,
  useQuestionsQuery,
  useUpdateQuestionMutation,
} from '../hooks/use-questions';

import type {
  QuestionDifficulty,
  QuestionReviewItemDto,
  QuestionStatus,
  QuestionUpdatePayload,
} from '@quizgen/shared';

const statusLabels: Record<QuestionStatus, string> = {
  not_checked: 'Not checked',
  approved: 'Approved',
  rejected: 'Rejected',
  needs_fix: 'Needs fix',
};

const difficultyLabels: Record<QuestionDifficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

const statusBadgeVariant = (status: QuestionStatus) => {
  if (status === 'approved') {
    return 'success' as const;
  }

  if (status === 'rejected') {
    return 'destructive' as const;
  }

  return 'outline' as const;
};

const toUpdatePayload = (question: QuestionReviewItemDto): QuestionUpdatePayload => ({
  stem: question.stem,
  optionA: question.optionA,
  optionB: question.optionB,
  optionC: question.optionC,
  optionD: question.optionD,
  explanation: question.explanation,
  correctOption: question.correctOption,
  difficulty: question.difficulty,
});

const buildEditField = <T extends keyof QuestionUpdatePayload>(
  key: T,
  value: QuestionUpdatePayload[T],
  onChange: (nextValue: QuestionUpdatePayload[T]) => void,
) => {
  if (key === 'difficulty' || key === 'correctOption') {
    const options = key === 'difficulty'
      ? (['easy', 'medium', 'hard'] as QuestionDifficulty[])
      : (['a', 'b', 'c', 'd'] as QuestionUpdatePayload['correctOption'][]);

    return (
      <select
        className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value as QuestionUpdatePayload[T])}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {key === 'difficulty' ? difficultyLabels[option as QuestionDifficulty] : option.toUpperCase()}
          </option>
        ))}
      </select>
    );
  }

  const isLongField = key === 'stem' || key === 'explanation';

  if (isLongField) {
    return (
      <textarea
        className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
        value={value as string}
        onChange={(event) => onChange(event.target.value as QuestionUpdatePayload[T])}
        rows={4}
      />
    );
  }

  return (
    <Input
      value={value as string}
      onChange={(event) => onChange(event.target.value as QuestionUpdatePayload[T])}
      className="mt-1"
    />
  );
};

const renderQuestionBankInfo = (question: QuestionReviewItemDto) => {
  if (!question.questionBankEntry) {
    return null;
  }

  const code = question.questionBankEntry.subjShortCode ?? 'Awaiting code';
  return (
    <Badge variant="success">{`Question Bank • ${code}`}</Badge>
  );
};

type StatusFilterValue = QuestionStatus | 'all';

export const EditorialWorkspace = () => {
  const { data: taxonomy } = useTaxonomyQuery();

  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('not_checked');
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editPayload, setEditPayload] = useState<QuestionUpdatePayload | null>(null);

  const availableClasses = taxonomy?.classes ?? [];

  useEffect(() => {
    if (!selectedClassId && availableClasses.length > 0) {
      setSelectedClassId(availableClasses[0].id);
    }
  }, [availableClasses, selectedClassId]);

  const availableSubjects = useMemo(() => {
    if (!selectedClassId) {
      return [] as typeof availableClasses[number]['subjects'];
    }

    const selectedClass = availableClasses.find((classLevel) => classLevel.id === selectedClassId);
    return selectedClass?.subjects ?? [];
  }, [availableClasses, selectedClassId]);

  useEffect(() => {
    if (availableSubjects.length === 0) {
      setSelectedSubjectId(null);
      return;
    }

    if (!selectedSubjectId || !availableSubjects.some((subject) => subject.id === selectedSubjectId)) {
      setSelectedSubjectId(availableSubjects[0].id);
    }
  }, [availableSubjects, selectedSubjectId]);

  const availableChapters = useMemo(() => {
    if (!selectedSubjectId) {
      return [] as (typeof availableSubjects)[number]['chapters'];
    }

    const selectedSubject = availableSubjects.find((subject) => subject.id === selectedSubjectId);
    return selectedSubject?.chapters ?? [];
  }, [availableSubjects, selectedSubjectId]);

  useEffect(() => {
    if (availableChapters.length === 0) {
      setSelectedChapterId(null);
      return;
    }

    if (!selectedChapterId || !availableChapters.some((chapter) => chapter.id === selectedChapterId)) {
      setSelectedChapterId(availableChapters[0].id);
    }
  }, [availableChapters, selectedChapterId]);

  const filters = useMemo(() => {
    if (!selectedClassId || !selectedSubjectId || !selectedChapterId) {
      return null;
    }

    return {
      classId: selectedClassId,
      subjectId: selectedSubjectId,
      chapterId: selectedChapterId,
      status: statusFilter,
      pageId: selectedPageId ?? undefined,
    };
  }, [selectedClassId, selectedSubjectId, selectedChapterId, statusFilter, selectedPageId]);

  const { data: questions, isLoading } = useQuestionsQuery(filters);

  const pageOptions = useMemo(() => {
    if (!questions) {
      return [] as { id: string; pageNumber: number }[];
    }

    const map = new Map<string, number>();
    questions.items.forEach((question) => {
      map.set(question.pageId, question.pageNumber);
    });

    return Array.from(map.entries())
      .map(([id, pageNumber]) => ({ id, pageNumber }))
      .sort((a, b) => a.pageNumber - b.pageNumber);
  }, [questions]);

  useEffect(() => {
    if (!selectedPageId) {
      return;
    }

    if (!pageOptions.some((option) => option.id === selectedPageId)) {
      setSelectedPageId(null);
    }
  }, [pageOptions, selectedPageId]);

  useEffect(() => {
    if (!questions) {
      setSelectedQuestionIds(new Set());
      return;
    }

    setSelectedQuestionIds((previous) => {
      const next = new Set<string>();
      questions.items.forEach((item) => {
        if (previous.has(item.id)) {
          next.add(item.id);
        }
      });
      return next;
    });
  }, [questions]);

  const updateMutation = useUpdateQuestionMutation();
  const bulkStatusMutation = useBulkStatusMutation();
  const bulkDeleteMutation = useBulkDeleteMutation();
  const bulkPublishMutation = useBulkPublishMutation();

  const toggleQuestionSelection = (questionId: string) => {
    setSelectedQuestionIds((previous) => {
      const next = new Set(previous);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const isQuestionSelected = (questionId: string) => selectedQuestionIds.has(questionId);
  const selectedCount = selectedQuestionIds.size;
  const allSelectableIds = questions?.items.filter((question) => !question.isLockedAfterAdd).map((question) => question.id) ?? [];
  const isAllSelected = allSelectableIds.length > 0 && allSelectableIds.every((id) => selectedQuestionIds.has(id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedQuestionIds(new Set());
      return;
    }

    setSelectedQuestionIds(new Set(allSelectableIds));
  };

  const startEditing = (question: QuestionReviewItemDto) => {
    setEditingQuestionId(question.id);
    setEditPayload(toUpdatePayload(question));
  };

  const cancelEditing = () => {
    setEditingQuestionId(null);
    setEditPayload(null);
  };

  const handleSaveEdit = async () => {
    if (!editingQuestionId || !editPayload) {
      return;
    }

    await updateMutation.mutateAsync({ questionId: editingQuestionId, payload: editPayload });
    setEditingQuestionId(null);
    setEditPayload(null);
  };

  const performBulkStatusUpdate = async (status: QuestionStatus) => {
    if (selectedCount === 0) {
      return;
    }

    await bulkStatusMutation.mutateAsync({ questionIds: Array.from(selectedQuestionIds), status });
    setSelectedQuestionIds(new Set());
  };

  const performBulkDelete = async () => {
    if (selectedCount === 0) {
      return;
    }

    await bulkDeleteMutation.mutateAsync({ questionIds: Array.from(selectedQuestionIds) });
    setSelectedQuestionIds(new Set());
  };

  const performBulkPublish = async () => {
    if (selectedCount === 0) {
      return;
    }

    await bulkPublishMutation.mutateAsync({ questionIds: Array.from(selectedQuestionIds) });
    setSelectedQuestionIds(new Set());
  };

  const resetFilters = () => {
    setStatusFilter('not_checked');
    setSelectedPageId(null);
  };

  const renderTableRow = (question: QuestionReviewItemDto) => {
    const isLocked = question.isLockedAfterAdd;
    const isSelected = isQuestionSelected(question.id);
    const isEditing = editingQuestionId === question.id;

    return (
      <TableRow key={question.id} className={isEditing ? 'bg-muted/50' : undefined}>
        <TableCell className="w-12">
          <input
            type="checkbox"
            aria-label={`Select question ${question.id}`}
            disabled={isLocked}
            checked={isSelected}
            onChange={() => toggleQuestionSelection(question.id)}
          />
        </TableCell>
        <TableCell className="w-40">
          <div className="flex flex-col gap-2">
            <Badge variant={statusBadgeVariant(question.status)}>{statusLabels[question.status]}</Badge>
            <Badge variant="outline">{difficultyLabels[question.difficulty]}</Badge>
            {renderQuestionBankInfo(question)}
          </div>
        </TableCell>
        <TableCell>
          <div className="space-y-2">
            <div>
              <p className="font-medium">{question.stem}</p>
              <p className="text-xs text-muted-foreground">Page {question.pageNumber} · Line {question.lineIndex + 1}</p>
            </div>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              <li className={question.correctOption === 'a' ? 'font-semibold text-primary' : undefined}>A. {question.optionA}</li>
              <li className={question.correctOption === 'b' ? 'font-semibold text-primary' : undefined}>B. {question.optionB}</li>
              <li className={question.correctOption === 'c' ? 'font-semibold text-primary' : undefined}>C. {question.optionC}</li>
              <li className={question.correctOption === 'd' ? 'font-semibold text-primary' : undefined}>D. {question.optionD}</li>
            </ul>
            <p className="text-sm text-muted-foreground">Explanation: {question.explanation}</p>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={question.pageImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary underline"
              >
                View page image
              </a>
              {!isLocked ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => startEditing(question)}
                  disabled={updateMutation.isPending}
                >
                  Edit question
                </Button>
              ) : (
                <Badge variant="outline">Locked</Badge>
              )}
            </div>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  const renderEditingRow = (question: QuestionReviewItemDto) => {
    if (editingQuestionId !== question.id || !editPayload) {
      return null;
    }

    return (
      <TableRow key={`${question.id}-edit`} className="bg-muted/80">
        <TableCell />
        <TableCell colSpan={2}>
          <div className="space-y-4">
            {(
              [
                ['stem', 'Stem'] as const,
                ['optionA', 'Option A'] as const,
                ['optionB', 'Option B'] as const,
                ['optionC', 'Option C'] as const,
                ['optionD', 'Option D'] as const,
                ['correctOption', 'Correct option'] as const,
                ['explanation', 'Explanation'] as const,
                ['difficulty', 'Difficulty'] as const,
              ]
            ).map(([field, label]) => (
              <div key={field}>
                <label className="text-sm font-medium text-muted-foreground" htmlFor={`${question.id}-${field}`}>
                  {label}
                </label>
                {buildEditField(field, editPayload[field], (nextValue) => {
                  setEditPayload((current) => ({
                    ...(current ?? toUpdatePayload(question)),
                    [field]: nextValue,
                  }));
                })}
              </div>
            ))}
            <div className="flex flex-wrap gap-3">
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Saving…' : 'Save changes'}
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelEditing} disabled={updateMutation.isPending}>
                Cancel
              </Button>
            </div>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Editorial review</CardTitle>
        <CardDescription>
          Filter questions, apply bulk actions, and publish approved items to the Question Bank.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-5">
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Class</label>
            <select
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
              value={selectedClassId ?? ''}
              onChange={(event) => {
                const value = Number.parseInt(event.target.value, 10);
                setSelectedClassId(Number.isNaN(value) ? null : value);
                setSelectedPageId(null);
              }}
            >
              {availableClasses.map((classLevel) => (
                <option key={classLevel.id} value={classLevel.id}>
                  {classLevel.displayName}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Subject</label>
            <select
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
              value={selectedSubjectId ?? ''}
              onChange={(event) => {
                setSelectedSubjectId(event.target.value || null);
                setSelectedPageId(null);
              }}
            >
              {availableSubjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Chapter</label>
            <select
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
              value={selectedChapterId ?? ''}
              onChange={(event) => {
                setSelectedChapterId(event.target.value || null);
                setSelectedPageId(null);
              }}
            >
              {availableChapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</label>
            <select
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilterValue)}
            >
              <option value="not_checked">Not checked</option>
              <option value="approved">Approved</option>
              <option value="needs_fix">Needs fix</option>
              <option value="rejected">Rejected</option>
              <option value="all">All statuses</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Page</label>
            <select
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
              value={selectedPageId ?? ''}
              onChange={(event) => setSelectedPageId(event.target.value || null)}
            >
              <option value="">All pages</option>
              {pageOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  Page {option.pageNumber}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>Total: {questions?.total ?? 0}</span>
          <span>Not checked: {questions?.statusCounts.not_checked ?? 0}</span>
          <span>Approved: {questions?.statusCounts.approved ?? 0}</span>
          <span>Needs fix: {questions?.statusCounts.needs_fix ?? 0}</span>
          <span>Rejected: {questions?.statusCounts.rejected ?? 0}</span>
          <Button size="sm" variant="ghost" onClick={resetFilters} disabled={isLoading}>
            Reset filters
          </Button>
        </div>

        <div className="overflow-hidden rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    aria-label="Select all questions"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-40">Status</TableHead>
                <TableHead>Question</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                    Loading questions…
                  </TableCell>
                </TableRow>
              ) : !filters ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                    Select a class, subject, and chapter to review questions.
                  </TableCell>
                </TableRow>
              ) : questions && questions.items.length > 0 ? (
                questions.items.flatMap((question) => [
                  renderTableRow(question),
                  renderEditingRow(question),
                ])
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                    No questions found for the selected filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            <TableCaption>
              {selectedCount > 0
                ? `${selectedCount} question${selectedCount === 1 ? '' : 's'} selected`
                : 'Select questions to perform bulk actions'}
            </TableCaption>
          </Table>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            size="sm"
            onClick={() => performBulkStatusUpdate('approved')}
            disabled={selectedCount === 0 || bulkStatusMutation.isPending}
          >
            Approve selected
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => performBulkStatusUpdate('needs_fix')}
            disabled={selectedCount === 0 || bulkStatusMutation.isPending}
          >
            Mark as needs fix
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => performBulkStatusUpdate('rejected')}
            disabled={selectedCount === 0 || bulkStatusMutation.isPending}
          >
            Reject selected
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={performBulkPublish}
            disabled={selectedCount === 0 || bulkPublishMutation.isPending}
          >
            Add to Question Bank
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={performBulkDelete}
            disabled={selectedCount === 0 || bulkDeleteMutation.isPending}
          >
            Delete selected
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

