'use client';

import { Fragment, useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { useTaxonomyQuery } from '@/features/taxonomy/hooks/use-taxonomy';
import { useChapterUploadsQuery, useRecentUpload } from '@/features/uploads/hooks/use-uploads';

import {
  useGenerationOverviewQuery,
  useRegeneratePageMutation,
  useRetryPageMutation,
  useStartGenerationMutation,
} from '../hooks/use-generation';

import type { ChapterDto, GenerationPageDto, SubjectDto } from '@quizgen/shared';

const statusVariantMap: Record<GenerationPageDto['status'], 'default' | 'outline' | 'secondary' | 'destructive'> = {
  pending: 'outline',
  queued: 'secondary',
  generating: 'default',
  complete: 'default',
  failed: 'destructive',
};

const formatTimestamp = (value: string | null) => {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleString();
};

type SelectionState = {
  classId: string;
  subjectId: string;
  chapterId: string;
  uploadId: string;
};

type AttemptListProps = {
  attempts: GenerationPageDto['attempts'];
};

const AttemptList = ({ attempts }: AttemptListProps): JSX.Element => {
  if (attempts.length === 0) {
    return <p className="text-sm text-muted-foreground">No attempts recorded yet.</p>;
  }

  return (
    <div className="space-y-2">
      {attempts.map((attempt) => (
        <div key={attempt.id} className="rounded-md border border-border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <Badge variant={attempt.isSuccess ? 'default' : 'destructive'}>
                {attempt.isSuccess ? 'Success' : 'Failed'}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Attempt {attempt.attemptNo} • {new Date(attempt.createdAt).toLocaleString()}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">{attempt.model}</span>
          </div>
          <dl className="mt-2 grid gap-1 text-xs text-muted-foreground md:grid-cols-2">
            <div>
              <dt className="font-semibold text-foreground">Prompt</dt>
              <dd>{attempt.requestExcerpt ?? '—'}</dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">Response</dt>
              <dd>{attempt.responseExcerpt ?? '—'}</dd>
            </div>
            {attempt.errorMessage ? (
              <div className="md:col-span-2">
                <dt className="font-semibold text-foreground">Error</dt>
                <dd className="text-destructive">{attempt.errorMessage}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      ))}
    </div>
  );
};

export const GenerationDashboardPanel = (): JSX.Element => {
  const taxonomyQuery = useTaxonomyQuery();
  const [selection, setSelection] = useState<SelectionState>({
    classId: '',
    subjectId: '',
    chapterId: '',
    uploadId: '',
  });

  const chapterUploadsQuery = useChapterUploadsQuery(selection.chapterId || null);
  const uploads = chapterUploadsQuery.data ?? [];
  const selectedUpload = useRecentUpload(uploads, selection.uploadId || null);

  useEffect(() => {
    if (!selection.uploadId && uploads.length > 0) {
      setSelection((prev) => ({ ...prev, uploadId: uploads[0].id }));
    }
  }, [uploads, selection.uploadId]);

  const effectiveUploadId = selectedUpload?.id ?? null;

  const generationOverviewQuery = useGenerationOverviewQuery(effectiveUploadId);
  const startGenerationMutation = useStartGenerationMutation();
  const retryMutation = useRetryPageMutation();
  const regenerateMutation = useRegeneratePageMutation();

  const classes = taxonomyQuery.data?.classes ?? [];
  const selectedClass = classes.find((item) => item.id === Number(selection.classId));
  const subjects: SubjectDto[] = selectedClass?.subjects ?? [];
  const selectedSubject = subjects.find((item) => item.id === selection.subjectId);
  const chapters: ChapterDto[] = selectedSubject?.chapters ?? [];

  const handleSelectionChange = (
    field: keyof SelectionState,
    value: string,
  ) => {
    setSelection((prev) => {
      const next: SelectionState = {
        classId: field === 'classId' ? value : prev.classId,
        subjectId: field === 'subjectId' ? value : field === 'classId' ? '' : prev.subjectId,
        chapterId:
          field === 'chapterId'
            ? value
            : field === 'subjectId' || field === 'classId'
            ? ''
            : prev.chapterId,
        uploadId: field === 'uploadId' ? value : field === 'chapterId' ? '' : prev.uploadId,
      };

      return next;
    });
  };

  const overview = generationOverviewQuery.data;
  const isLoading = generationOverviewQuery.isLoading;
  const statusCounts = overview?.statusCounts ?? {
    pending: 0,
    queued: 0,
    generating: 0,
    complete: 0,
    failed: 0,
  };

  const canStartGeneration = Boolean(effectiveUploadId) && !startGenerationMutation.isPending;

  const handleStartGeneration = async () => {
    if (!effectiveUploadId) {
      return;
    }

    await startGenerationMutation.mutateAsync(effectiveUploadId);
  };

  const handleRetryPage = async (pageId: string) => {
    await retryMutation.mutateAsync(pageId);
  };

  const handleRegeneratePage = async (pageId: string) => {
    await regenerateMutation.mutateAsync(pageId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generation pipeline</CardTitle>
        <CardDescription>
          Track generation progress for each upload, inspect attempt history, and trigger retries or regeneration when needed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="class-select">Class</Label>
            <select
              id="class-select"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={selection.classId}
              onChange={(event) => handleSelectionChange('classId', event.target.value)}
            >
              <option value="">Select class</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.displayName}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject-select">Subject</Label>
            <select
              id="subject-select"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={selection.subjectId}
              onChange={(event) => handleSelectionChange('subjectId', event.target.value)}
              disabled={!selection.classId}
            >
              <option value="">Select subject</option>
              {subjects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="chapter-select">Chapter</Label>
            <select
              id="chapter-select"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={selection.chapterId}
              onChange={(event) => handleSelectionChange('chapterId', event.target.value)}
              disabled={!selection.subjectId}
            >
              <option value="">Select chapter</option>
              {chapters.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.ordinal}. {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="upload-select">Upload</Label>
            <select
              id="upload-select"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={selection.uploadId}
              onChange={(event) => handleSelectionChange('uploadId', event.target.value)}
              disabled={!selection.chapterId || uploads.length === 0}
            >
              <option value="">{uploads.length === 0 ? 'No uploads yet' : 'Select upload'}</option>
              {uploads.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.originalFilename}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-3 rounded-lg border border-dashed border-border p-4 md:grid-cols-5">
          {(
            [
              { label: 'Pending', value: statusCounts.pending },
              { label: 'Queued', value: statusCounts.queued },
              { label: 'In progress', value: statusCounts.generating },
              { label: 'Complete', value: statusCounts.complete },
              { label: 'Failed', value: statusCounts.failed },
            ] as const
          ).map((item) => (
            <div key={item.label} className="text-center">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-lg font-semibold">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {selectedUpload ? selectedUpload.originalFilename : 'Choose an upload to load status.'}
            </p>
            {selectedUpload ? (
              <p className="text-xs text-muted-foreground">
                Uploaded on {new Date(selectedUpload.createdAt).toLocaleString()}
              </p>
            ) : null}
          </div>
          <Button onClick={handleStartGeneration} disabled={!canStartGeneration}>
            {startGenerationMutation.isPending ? 'Starting…' : 'Start generation'}
          </Button>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Pages</h3>
            <Input
              readOnly
              value={effectiveUploadId ?? ''}
              placeholder="Upload ID"
              className="max-w-xs text-xs"
            />
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading generation details…</p>
          ) : overview ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Page</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead>Last generated</TableHead>
                  <TableHead className="w-[200px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.pages.map((page) => (
                  <Fragment key={page.id}>
                    <TableRow>
                      <TableCell>{page.pageNumber}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariantMap[page.status]}>{page.status}</Badge>
                      </TableCell>
                      <TableCell>{page.questionCount}</TableCell>
                      <TableCell>{formatTimestamp(page.lastGeneratedAt)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRetryPage(page.id)}
                            disabled={page.status !== 'failed' || retryMutation.isPending}
                          >
                            {retryMutation.isPending ? 'Retrying…' : 'Retry'}
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleRegeneratePage(page.id)}
                            disabled={
                              regenerateMutation.isPending ||
                              (page.status !== 'complete' && page.status !== 'failed')
                            }
                          >
                            {regenerateMutation.isPending ? 'Queuing…' : 'Regenerate'}
                          </Button>
                          {page.pngUrl ? (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={page.pngUrl} target="_blank" rel="noreferrer">
                                View page
                              </a>
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={5}>
                        <AttemptList attempts={page.attempts} />
                      </TableCell>
                    </TableRow>
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select an upload to load generation details.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
