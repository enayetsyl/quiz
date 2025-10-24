'use client';

import { useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

import { cn } from '@/lib/utils';

import {
  useCreateChapterMutation,
  useCreateSubjectMutation,
  useDeleteChapterMutation,
  useDeleteSubjectMutation,
  useTaxonomyQuery,
  useUpdateChapterMutation,
  useUpdateSubjectMutation
} from '../hooks/use-taxonomy';
import type { ChapterInfo, SubjectInfo } from '../types';

const SUBJECT_CODE_REGEX = /^[A-Z]{2}$/;

type SubjectCreateFormProps = {
  classId: number;
  onCreate: (values: { name: string; code: string | null }) => Promise<void>;
  isSubmitting: boolean;
};

export const SubjectCreateForm = ({ classId, onCreate, isSubmitting }: SubjectCreateFormProps) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedCode = code.trim();

    if (!trimmedName) {
      setError('Subject name is required');
      return;
    }

    if (trimmedCode && !SUBJECT_CODE_REGEX.test(trimmedCode)) {
      setError('Subject code must be two uppercase letters');
      return;
    }

    setError(null);
    await onCreate({
      name: trimmedName,
      code: trimmedCode ? trimmedCode.toUpperCase() : null
    });
    setName('');
    setCode('');
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <Label htmlFor={`subject-name-${classId}`}>Subject name</Label>
        <Input
          id={`subject-name-${classId}`}
          placeholder="Enter subject name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor={`subject-code-${classId}`}>Subject code</Label>
        <Input
          id={`subject-code-${classId}`}
          placeholder="Two uppercase letters"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          maxLength={2}
        />
        <p className="mt-1 text-xs text-muted-foreground">Optional; used for printable IDs.</p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating…' : 'Add subject'}
      </Button>
    </form>
  );
};

type SubjectDetailsFormProps = {
  subject: SubjectInfo;
  onUpdate: (values: { name: string; code: string | null }) => Promise<void>;
  onDelete: () => Promise<void>;
  isUpdating: boolean;
  isDeleting: boolean;
};

export const SubjectDetailsForm = ({
  subject,
  onUpdate,
  onDelete,
  isUpdating,
  isDeleting
}: SubjectDetailsFormProps) => {
  const [name, setName] = useState(subject.name);
  const [code, setCode] = useState(subject.code ?? '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(subject.name);
    setCode(subject.code ?? '');
    setError(null);
  }, [subject]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedCode = code.trim();

    if (!trimmedName) {
      setError('Subject name is required');
      return;
    }

    if (trimmedCode && !SUBJECT_CODE_REGEX.test(trimmedCode)) {
      setError('Subject code must be two uppercase letters');
      return;
    }

    setError(null);
    await onUpdate({
      name: trimmedName,
      code: trimmedCode ? trimmedCode.toUpperCase() : null
    });
  };

  const handleDelete = async () => {
    await onDelete();
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <Label htmlFor={`subject-name-${subject.id}`}>Subject name</Label>
        <Input
          id={`subject-name-${subject.id}`}
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor={`subject-code-${subject.id}`}>Subject code</Label>
        <Input
          id={`subject-code-${subject.id}`}
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          maxLength={2}
        />
        <p className="mt-1 text-xs text-muted-foreground">Optional; used for printable IDs.</p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isUpdating}>
          {isUpdating ? 'Saving…' : 'Save changes'}
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? 'Removing…' : 'Remove subject'}
        </Button>
      </div>
    </form>
  );
};

type ChapterFormValues = {
  name: string;
  ordinal: number;
};

type ChapterFormProps = {
  mode: 'create' | 'edit';
  existingOrdinals: number[];
  initialValues?: ChapterFormValues;
  onSubmit: (values: ChapterFormValues) => Promise<void>;
  onCancel?: () => void;
  isSubmitting: boolean;
};

export const ChapterForm = ({
  mode,
  existingOrdinals,
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting
}: ChapterFormProps) => {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [ordinal, setOrdinal] = useState(initialValues ? String(initialValues.ordinal) : '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(initialValues?.name ?? '');
    setOrdinal(initialValues ? String(initialValues.ordinal) : '');
    setError(null);
  }, [initialValues]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const parsedOrdinal = Number(ordinal);

    if (!trimmedName) {
      setError('Chapter name is required');
      return;
    }

    if (!Number.isInteger(parsedOrdinal) || parsedOrdinal <= 0) {
      setError('Ordinal must be a positive integer');
      return;
    }

    const currentOrdinal = initialValues?.ordinal;
    const hasDuplicate = existingOrdinals.some((value) => {
      if (mode === 'edit' && currentOrdinal === value) {
        return false;
      }
      return value === parsedOrdinal;
    });

    if (hasDuplicate) {
      setError('A chapter with this ordinal already exists');
      return;
    }

    setError(null);
    await onSubmit({ name: trimmedName, ordinal: parsedOrdinal });

    if (mode === 'create') {
      setName('');
      setOrdinal('');
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <Label htmlFor={`chapter-name-${mode}`}>Chapter name</Label>
        <Input
          id={`chapter-name-${mode}`}
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor={`chapter-ordinal-${mode}`}>Ordinal</Label>
        <Input
          id={`chapter-ordinal-${mode}`}
          type="number"
          min={1}
          value={ordinal}
          onChange={(event) => setOrdinal(event.target.value)}
          required
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Ordinal controls chapter ordering inside a subject.
        </p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : mode === 'create' ? 'Add chapter' : 'Save changes'}
        </Button>
        {mode === 'edit' && onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
};

export const TaxonomyManager = (): JSX.Element => {
  const { data, isLoading } = useTaxonomyQuery();
  const createSubjectMutation = useCreateSubjectMutation();
  const updateSubjectMutation = useUpdateSubjectMutation();
  const deleteSubjectMutation = useDeleteSubjectMutation();
  const createChapterMutation = useCreateChapterMutation();
  const updateChapterMutation = useUpdateChapterMutation();
  const deleteChapterMutation = useDeleteChapterMutation();

  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);

  useEffect(() => {
    if (!data || data.classes.length === 0) {
      setSelectedClassId(null);
      return;
    }

    setSelectedClassId((previous) => {
      if (!previous) {
        return data.classes[0].id;
      }

      return data.classes.some((entry) => entry.id === previous)
        ? previous
        : data.classes[0].id;
    });
  }, [data]);

  useEffect(() => {
    if (!data || selectedClassId === null) {
      setSelectedSubjectId(null);
      return;
    }

    const classInfo = data.classes.find((entry) => entry.id === selectedClassId);
    if (!classInfo || classInfo.subjects.length === 0) {
      setSelectedSubjectId(null);
      return;
    }

    setSelectedSubjectId((previous) => {
      if (!previous) {
        return classInfo.subjects[0].id;
      }

      return classInfo.subjects.some((entry) => entry.id === previous)
        ? previous
        : classInfo.subjects[0].id;
    });
  }, [data, selectedClassId]);

  const selectedClass = useMemo(
    () => data?.classes.find((entry) => entry.id === selectedClassId) ?? null,
    [data, selectedClassId]
  );

  const selectedSubject: SubjectInfo | null = useMemo(() => {
    if (!selectedClass) {
      return null;
    }

    return selectedClass.subjects.find((entry) => entry.id === selectedSubjectId) ?? null;
  }, [selectedClass, selectedSubjectId]);

  useEffect(() => {
    if (!selectedSubject) {
      setEditingChapterId(null);
    }
  }, [selectedSubject]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading taxonomy</CardTitle>
          <CardDescription>Fetching class levels, subjects, and chapters…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!data || data.classes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Taxonomy configuration</CardTitle>
          <CardDescription>No class levels configured yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Add class levels through the backend seed or the API before managing subjects and chapters here.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleCreateSubject = async (values: { name: string; code: string | null }) => {
    if (selectedClassId === null) {
      return;
    }

    const subject = await createSubjectMutation.mutateAsync({
      classId: selectedClassId,
      name: values.name,
      code: values.code
    });

    if (subject) {
      setSelectedSubjectId(subject.id);
    }
  };

  const handleUpdateSubject = async (values: { name: string; code: string | null }) => {
    if (!selectedSubject) {
      return;
    }

    await updateSubjectMutation.mutateAsync({
      id: selectedSubject.id,
      name: values.name,
      code: values.code
    });
  };

  const handleDeleteSubject = async () => {
    if (!selectedSubject) {
      return;
    }

    await deleteSubjectMutation.mutateAsync({ id: selectedSubject.id });
    setSelectedSubjectId(null);
  };

  const handleCreateChapter = async (values: ChapterFormValues) => {
    if (!selectedSubject) {
      return;
    }

    await createChapterMutation.mutateAsync({
      subjectId: selectedSubject.id,
      name: values.name,
      ordinal: values.ordinal
    });
    setEditingChapterId(null);
  };

  const handleUpdateChapter = async (values: ChapterFormValues) => {
    if (!selectedSubject || !editingChapterId) {
      return;
    }

    await updateChapterMutation.mutateAsync({
      id: editingChapterId,
      name: values.name,
      ordinal: values.ordinal
    });
    setEditingChapterId(null);
  };

  const handleDeleteChapter = async (chapter: ChapterInfo) => {
    await deleteChapterMutation.mutateAsync({ id: chapter.id });
    if (editingChapterId === chapter.id) {
      setEditingChapterId(null);
    }
  };

  const classButtons = data.classes.map((classLevel) => (
    <Button
      key={classLevel.id}
      variant={classLevel.id === selectedClassId ? 'default' : 'outline'}
      onClick={() => setSelectedClassId(classLevel.id)}
    >
      <div className="flex flex-col items-center">
        <span className="font-semibold">{classLevel.displayName}</span>
        <span className="text-xs text-muted-foreground">
          {classLevel.subjects.length} {classLevel.subjects.length === 1 ? 'subject' : 'subjects'}
        </span>
      </div>
    </Button>
  ));

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Class levels</CardTitle>
          <CardDescription>Select a class to manage its subjects and chapters.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">{classButtons}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subjects</CardTitle>
          <CardDescription>
            Create, update, or remove subjects for the selected class level.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground">Existing subjects</h3>
            <Separator className="my-3" />
            {selectedClass && selectedClass.subjects.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Chapters</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedClass.subjects.map((subject) => (
                    <TableRow key={subject.id}>
                      <TableCell className="font-medium">{subject.name}</TableCell>
                      <TableCell>{subject.code ? <Badge variant="outline">{subject.code}</Badge> : '—'}</TableCell>
                      <TableCell>{subject.chapters.length}</TableCell>
                      <TableCell>{new Date(subject.updatedAt).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant={subject.id === selectedSubjectId ? 'default' : 'secondary'}
                          size="sm"
                          onClick={() => setSelectedSubjectId(subject.id)}
                        >
                          Manage
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No subjects available for this class yet.</p>
            )}
          </div>
          <Separator />
          {selectedClassId !== null ? (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Create a new subject</h3>
                <SubjectCreateForm
                  classId={selectedClassId}
                  onCreate={handleCreateSubject}
                  isSubmitting={createSubjectMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Subject details</h3>
                {selectedSubject ? (
                  <SubjectDetailsForm
                    subject={selectedSubject}
                    onUpdate={handleUpdateSubject}
                    onDelete={handleDeleteSubject}
                    isUpdating={updateSubjectMutation.isPending}
                    isDeleting={deleteSubjectMutation.isPending}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select a subject to review its details or remove it.
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chapters</CardTitle>
          <CardDescription>Manage the chapter list for the selected subject.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {selectedSubject ? (
            <>
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground">
                  Chapters for {selectedSubject.name}
                </h3>
                <Separator className="my-3" />
                {selectedSubject.chapters.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Ordinal</TableHead>
                        <TableHead>Updated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedSubject.chapters.map((chapter) => (
                        <TableRow
                          key={chapter.id}
                          className={cn(editingChapterId === chapter.id ? 'bg-muted/50' : undefined)}
                        >
                          <TableCell className="font-medium">{chapter.name}</TableCell>
                          <TableCell>{chapter.ordinal}</TableCell>
                          <TableCell>{new Date(chapter.updatedAt).toLocaleString()}</TableCell>
                          <TableCell className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setEditingChapterId(chapter.id)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteChapter(chapter)}
                              disabled={deleteChapterMutation.isPending}
                            >
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No chapters added yet. Use the form below to create one.
                  </p>
                )}
              </div>
              <Separator />
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Create a new chapter</h3>
                  <ChapterForm
                    mode="create"
                    existingOrdinals={selectedSubject.chapters.map((chapter) => chapter.ordinal)}
                    onSubmit={handleCreateChapter}
                    isSubmitting={createChapterMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Edit chapter</h3>
                  {editingChapterId ? (
                    <ChapterForm
                      mode="edit"
                      existingOrdinals={selectedSubject.chapters.map((chapter) => chapter.ordinal)}
                      initialValues={selectedSubject.chapters.find((chapter) => chapter.id === editingChapterId)}
                      onSubmit={handleUpdateChapter}
                      onCancel={() => setEditingChapterId(null)}
                      isSubmitting={updateChapterMutation.isPending}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Select a chapter from the table to edit its information.
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a subject to view and manage its chapters.
            </p>
          )}
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            Chapters inherit their class and subject from the selected subject. Ordinals must remain unique per subject.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};
