'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/lib/toast';

import { useTaxonomyQuery } from '@/features/taxonomy/hooks/use-taxonomy';
import {
  useChapterUploadsQuery,
  useCreateUploadMutation,
  useRecentUpload,
  useUploadDetailQuery,
} from '@/features/uploads/hooks/use-uploads';

import type { ChapterDto, SubjectDto, UploadPageDto } from '@quizgen/shared';
import { formatDisplayDateTime } from '@quizgen/shared';

type WorkflowStep = 1 | 2 | 3;

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

const steps: { id: WorkflowStep; label: string }[] = [
  { id: 1, label: 'Classify upload' },
  { id: 2, label: 'Upload PDF' },
  { id: 3, label: 'Monitor rasterization' },
];

const statusLabelMap: Record<UploadPageDto['status'], string> = {
  pending: 'Pending',
  queued: 'Queued',
  generating: 'Generating',
  complete: 'Complete',
  failed: 'Failed',
};

const statusVariantMap: Record<UploadPageDto['status'], 'outline' | 'default' | 'success' | 'destructive'> = {
  pending: 'outline',
  queued: 'default',
  generating: 'default',
  complete: 'success',
  failed: 'destructive',
};

const buildPageAction = (page: UploadPageDto) => {
  if (!page.pngUrl) {
    return null;
  }

  return (
    <Button variant="outline" size="sm" asChild>
      <a href={page.pngUrl} target="_blank" rel="noreferrer">
        View page
      </a>
    </Button>
  );
};

const buildThumbnailLink = (page: UploadPageDto) => {
  if (!page.thumbnailUrl) {
    return 'Processing';
  }

  return (
    <Button variant="ghost" size="sm" asChild>
      <a href={page.thumbnailUrl} target="_blank" rel="noreferrer">
        Preview
      </a>
    </Button>
  );
};

type SelectionState = {
  classId: string;
  subjectId: string;
  chapterId: string;
};

export const UploadWorkflowPanel = (): JSX.Element => {
  const taxonomyQuery = useTaxonomyQuery();
  const [step, setStep] = useState<WorkflowStep>(1);
  const [selection, setSelection] = useState<SelectionState>({ classId: '', subjectId: '', chapterId: '' });
  const [file, setFile] = useState<File | null>(null);
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null);

  const createUploadMutation = useCreateUploadMutation();

  const chapterUploadsQuery = useChapterUploadsQuery(selection.chapterId || null);
  const uploadDetailQuery = useUploadDetailQuery(activeUploadId);
  const { refetch: refetchUploadDetail } = uploadDetailQuery;
  const recentUpload = useRecentUpload(chapterUploadsQuery.data, activeUploadId);

  useEffect(() => {
    if (!activeUploadId) {
      return;
    }

    const timer = window.setInterval(() => {
      void refetchUploadDetail();
    }, 5000);

    return () => {
      window.clearInterval(timer);
    };
  }, [activeUploadId, refetchUploadDetail]);

  const classes = taxonomyQuery.data?.classes ?? [];
  const selectedClass = classes.find((item) => item.id === Number(selection.classId));
  const subjects: SubjectDto[] = selectedClass?.subjects ?? [];
  const selectedSubject = subjects.find((item) => item.id === selection.subjectId);
  const chapters: ChapterDto[] = selectedSubject?.chapters ?? [];

  const handleSelectionChange = useCallback(
    (field: keyof SelectionState, value: string) => {
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
        };

        return next;
      });
      setActiveUploadId(null);
      if (field !== 'chapterId') {
        setFile(null);
        setStep(1);
      }
    },
    []
  );

  const handleContinue = useCallback(() => {
    if (!selection.classId || !selection.subjectId || !selection.chapterId) {
      toast.error('Please complete the classification before continuing.');
      return;
    }

    setStep(2);
  }, [selection]);

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((event) => {
    const nextFile = event.target.files?.[0];

    if (!nextFile) {
      setFile(null);
      return;
    }

    if (!nextFile.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Only PDF files can be uploaded.');
      event.target.value = '';
      return;
    }

    if (nextFile.size > MAX_FILE_SIZE_BYTES) {
      toast.error('File is larger than the 20 MB limit.');
      event.target.value = '';
      return;
    }

    setFile(nextFile);
  }, []);

  const handleStartUpload = useCallback(async () => {
    if (!selection.classId || !selection.subjectId || !selection.chapterId || !file) {
      toast.error('Provide a PDF and classification details before uploading.');
      return;
    }

    try {
      const upload = await createUploadMutation.mutateAsync({
        classId: Number(selection.classId),
        subjectId: selection.subjectId,
        chapterId: selection.chapterId,
        file,
      });

      setActiveUploadId(upload.id);
      setFile(null);
      setStep(3);
    } catch {
      // errors handled by interceptor toast
    }
  }, [createUploadMutation, file, selection]);

  const handleStartOver = useCallback(() => {
    setStep(1);
    setSelection({ classId: '', subjectId: '', chapterId: '' });
    setFile(null);
    setActiveUploadId(null);
  }, []);

  const pages = uploadDetailQuery.data?.pages ?? [];

  const stepContent = useMemo(() => {
    if (step === 1) {
      return (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="upload-class">Class</Label>
              <select
                id="upload-class"
                value={selection.classId}
                onChange={(event) => handleSelectionChange('classId', event.target.value)}
                className="h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring focus-visible:ring-border"
              >
                <option value="">Select class</option>
                {classes.map((classLevel) => (
                  <option key={classLevel.id} value={classLevel.id}>
                    Class {classLevel.id} — {classLevel.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="upload-subject">Subject</Label>
              <select
                id="upload-subject"
                value={selection.subjectId}
                onChange={(event) => handleSelectionChange('subjectId', event.target.value)}
                disabled={!selection.classId}
                className="h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring focus-visible:ring-border disabled:cursor-not-allowed"
              >
                <option value="">Select subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                    {subject.code ? ` (${subject.code})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="upload-chapter">Chapter</Label>
              <select
                id="upload-chapter"
                value={selection.chapterId}
                onChange={(event) => handleSelectionChange('chapterId', event.target.value)}
                disabled={!selection.subjectId}
                className="h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring focus-visible:ring-border disabled:cursor-not-allowed"
              >
                <option value="">Select chapter</option>
                {chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.ordinal}. {chapter.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="upload-file">PDF document</Label>
            <Input id="upload-file" type="file" accept="application/pdf" onChange={handleFileChange} />
            <p className="text-sm text-muted-foreground">Max 20 MB. Keep under 100 pages.</p>
          </div>
          {file ? (
            <div className="rounded-md border border-dashed border-border bg-muted/40 p-4 text-sm">
              <p className="font-medium">Ready to upload</p>
              <p className="text-muted-foreground">
                {file.name} — {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Monitoring rasterization</p>
            {recentUpload ? (
              <p className="text-xs text-muted-foreground">
                Latest upload created {formatDisplayDateTime(new Date(recentUpload.createdAt))}
              </p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchUploadDetail()}
              disabled={!activeUploadId || uploadDetailQuery.isFetching}
            >
              {uploadDetailQuery.isFetching ? 'Refreshing…' : 'Refresh status'}
            </Button>
            <Button variant="secondary" size="sm" onClick={handleStartOver}>
              Start new upload
            </Button>
          </div>
        </div>
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Page</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Preview</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                    {uploadDetailQuery.isLoading ? 'Loading pages…' : 'Upload details will appear once processing begins.'}
                  </TableCell>
                </TableRow>
              ) : (
                pages.map((page) => (
                  <TableRow key={page.id}>
                    <TableCell>Page {page.pageNumber}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariantMap[page.status]}>{statusLabelMap[page.status]}</Badge>
                    </TableCell>
                    <TableCell>{buildThumbnailLink(page)}</TableCell>
                    <TableCell>{buildPageAction(page)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            <TableCaption>Pages refresh automatically every few seconds while processing.</TableCaption>
          </Table>
        </div>
        <Separator />
        <section className="space-y-4">
          <h3 className="text-sm font-semibold">Recent uploads for this chapter</h3>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(chapterUploadsQuery.data ?? []).map((item) => {
                  const completedPercentage = Math.round((item.completedPages / item.pagesCount) * 100);

                  return (
                    <TableRow key={item.id}>
                      <TableCell>{formatDisplayDateTime(new Date(item.createdAt))}</TableCell>
                      <TableCell>{item.originalFilename}</TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {item.completedPages} / {item.pagesCount} pages ({Number.isNaN(completedPercentage) ? 0 : completedPercentage}%)
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={item.pdfUrl} target="_blank" rel="noreferrer">
                            Source PDF
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {chapterUploadsQuery.data?.length ? null : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      Uploads will appear here once available for this chapter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    );
  }, [
    activeUploadId,
    chapterUploadsQuery.data,
    chapters,
    classes,
    file,
    handleFileChange,
    handleSelectionChange,
    handleStartOver,
    pages,
    recentUpload,
    selection,
    step,
    subjects,
    uploadDetailQuery.isLoading,
    uploadDetailQuery.isFetching,
    uploadDetailQuery.refetch,
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload and rasterize PDF pages</CardTitle>
        <CardDescription>
          Classify the source material, upload the PDF, and track page rasterization progress from this panel.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="flex flex-wrap gap-2">
          {steps.map((item) => (
            <Badge key={item.id} variant={item.id === step ? 'default' : 'outline'}>
              Step {item.id}: {item.label}
            </Badge>
          ))}
        </div>
        {stepContent}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="ghost" size="sm" onClick={handleStartOver}>
          Reset
        </Button>
        {step === 1 ? (
          <Button onClick={handleContinue} disabled={taxonomyQuery.isLoading}>
            Continue
          </Button>
        ) : null}
        {step === 2 ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)} disabled={createUploadMutation.isPending}>
              Back
            </Button>
            <Button onClick={handleStartUpload} disabled={createUploadMutation.isPending}>
              {createUploadMutation.isPending ? 'Uploading…' : 'Start upload'}
            </Button>
          </div>
        ) : null}
        {step === 3 ? (
          <Button variant="outline" size="sm" onClick={() => refetchUploadDetail()} disabled={!activeUploadId}>
            Refresh now
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
};

