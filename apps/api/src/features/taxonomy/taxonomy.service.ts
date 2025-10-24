import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import type {
  ChapterDto,
  ClassLevelDto,
  SubjectDto,
  TaxonomyResponse
} from "@quizgen/shared";

const DEFAULT_CLASS_LEVELS: ReadonlyArray<{ id: number; displayName: string }> = [
  { id: 6, displayName: "Class 6" },
  { id: 7, displayName: "Class 7" },
  { id: 8, displayName: "Class 8" },
  { id: 9, displayName: "Class 9" },
  { id: 10, displayName: "Class 10" }
];

const chapterSelect = {
  id: true,
  subjectId: true,
  name: true,
  ordinal: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.ChapterSelect;

type ChapterRecord = Prisma.ChapterGetPayload<{ select: typeof chapterSelect }>;

const subjectSelect = {
  id: true,
  classId: true,
  name: true,
  code: true,
  createdAt: true,
  updatedAt: true,
  chapters: {
    select: chapterSelect,
    orderBy: { ordinal: "asc" }
  }
} satisfies Prisma.SubjectSelect;

type SubjectRecord = Prisma.SubjectGetPayload<{ select: typeof subjectSelect }>;

const classLevelSelect = {
  id: true,
  displayName: true,
  subjects: {
    select: subjectSelect,
    orderBy: { name: "asc" }
  }
} satisfies Prisma.ClassLevelSelect;

type ClassLevelRecord = Prisma.ClassLevelGetPayload<{ select: typeof classLevelSelect }>;

const mapChapter = (chapter: ChapterRecord): ChapterDto => ({
  id: chapter.id,
  subjectId: chapter.subjectId,
  name: chapter.name,
  ordinal: chapter.ordinal,
  createdAt: chapter.createdAt.toISOString(),
  updatedAt: chapter.updatedAt.toISOString()
});

const mapSubject = (subject: SubjectRecord): SubjectDto => ({
  id: subject.id,
  classId: subject.classId,
  name: subject.name,
  code: subject.code ?? null,
  createdAt: subject.createdAt.toISOString(),
  updatedAt: subject.updatedAt.toISOString(),
  chapters: subject.chapters.map(mapChapter)
});

const mapClassLevel = (classLevel: ClassLevelRecord): ClassLevelDto => ({
  id: classLevel.id,
  displayName: classLevel.displayName,
  subjects: classLevel.subjects.map(mapSubject)
});

export const ensureDefaultClassLevels = async () => {
  await prisma.$transaction(
    DEFAULT_CLASS_LEVELS.map((level) =>
      prisma.classLevel.upsert({
        where: { id: level.id },
        update: {},
        create: { id: level.id, displayName: level.displayName }
      })
    )
  );
};

export const getTaxonomy = async (): Promise<TaxonomyResponse> => {
  await ensureDefaultClassLevels();

  const classes = await prisma.classLevel.findMany({
    select: classLevelSelect,
    orderBy: { id: "asc" }
  });

  return { classes: classes.map(mapClassLevel) };
};

type CreateClassLevelParams = {
  id: number;
  displayName: string;
};

export const createClassLevel = async (
  params: CreateClassLevelParams
): Promise<ClassLevelDto> => {
  const classLevel = await prisma.classLevel.create({
    data: {
      id: params.id,
      displayName: params.displayName
    },
    select: classLevelSelect
  });

  return mapClassLevel(classLevel);
};

type UpdateClassLevelParams = {
  id: number;
  displayName: string;
};

export const updateClassLevel = async (
  params: UpdateClassLevelParams
): Promise<ClassLevelDto> => {
  const classLevel = await prisma.classLevel.update({
    where: { id: params.id },
    data: { displayName: params.displayName },
    select: classLevelSelect
  });

  return mapClassLevel(classLevel);
};

export const deleteClassLevel = async (id: number) => {
  await prisma.classLevel.delete({ where: { id } });
};

type CreateSubjectParams = {
  classId: number;
  name: string;
  code: string | null | undefined;
};

export const createSubject = async (
  params: CreateSubjectParams
): Promise<SubjectDto> => {
  const subject = await prisma.subject.create({
    data: {
      classId: params.classId,
      name: params.name.trim(),
      code: params.code ? params.code.toUpperCase() : null
    },
    select: subjectSelect
  });

  return mapSubject(subject);
};

type UpdateSubjectParams = {
  id: string;
  name?: string;
  code?: string | null;
};

export const updateSubject = async (
  params: UpdateSubjectParams
): Promise<SubjectDto> => {
  const subject = await prisma.subject.update({
    where: { id: params.id },
    data: {
      ...(params.name ? { name: params.name.trim() } : {}),
      ...(params.code !== undefined
        ? { code: params.code ? params.code.toUpperCase() : null }
        : {})
    },
    select: subjectSelect
  });

  return mapSubject(subject);
};

export const deleteSubject = async (id: string) => {
  await prisma.subject.delete({ where: { id } });
};

type CreateChapterParams = {
  subjectId: string;
  name: string;
  ordinal: number;
};

export const createChapter = async (
  params: CreateChapterParams
): Promise<ChapterDto> => {
  const chapter = await prisma.chapter.create({
    data: {
      subjectId: params.subjectId,
      name: params.name.trim(),
      ordinal: params.ordinal
    },
    select: chapterSelect
  });

  return mapChapter(chapter);
};

type UpdateChapterParams = {
  id: string;
  name?: string;
  ordinal?: number;
};

export const updateChapter = async (
  params: UpdateChapterParams
): Promise<ChapterDto> => {
  const chapter = await prisma.chapter.update({
    where: { id: params.id },
    data: {
      ...(params.name ? { name: params.name.trim() } : {}),
      ...(params.ordinal !== undefined ? { ordinal: params.ordinal } : {})
    },
    select: chapterSelect
  });

  return mapChapter(chapter);
};

export const deleteChapter = async (id: string) => {
  await prisma.chapter.delete({ where: { id } });
};
