import type { Prisma } from "@prisma/client";
import { Prisma as PrismaNamespace } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { createPresignedUrl } from "@/utils/s3";

import type {
  InternalApprovedQuestionsQuery,
  InternalApprovedQuestionsResponse,
  QuestionBankExportFilters,
  QuestionBankExportResponse,
  QuestionBankExportRow,
  QuestionExportFilters,
  QuestionExportResponse,
  QuestionExportRow,
  QuestionStatus
} from "@quizgen/shared";

const { sql, join, empty } = PrismaNamespace;

type RawQuestionRow = {
  question_id: string;
  class: number;
  subject: string;
  chapter: string;
  page: number;
  language: string | null;
  difficulty: string | null;
  stem: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string | null;
  status: string;
  created_at: Date | string;
  source_page_image_url: string | null;
};

type RawQuestionBankRow = {
  question_bank_id: string;
  subj_short_code: string | null;
  seq_no: number | null;
  class: number;
  subject: string;
  chapter: string;
  page: number | null;
  language: string | null;
  difficulty: string | null;
  stem: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string | null;
  created_at: Date | string;
  source_page_image_url: string | null;
};

type QueryOptions = {
  limit?: number;
  offset?: number;
};

type S3Location = {
  bucket: string;
  key: string;
};

const toIsoString = (value: Date | string) =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

const parseS3Location = (uri: string | null): S3Location | null => {
  if (!uri || !uri.startsWith("s3://")) {
    return null;
  }

  const withoutScheme = uri.replace("s3://", "");
  const slashIndex = withoutScheme.indexOf("/");

  if (slashIndex <= 0) {
    return null;
  }

  const bucket = withoutScheme.slice(0, slashIndex);
  const key = withoutScheme.slice(slashIndex + 1);

  if (!bucket || !key) {
    return null;
  }

  return { bucket, key };
};

const createSignedUrlLoader = () => {
  const cache = new Map<string, string | null>();

  return async (uri: string | null) => {
    if (!uri) {
      return null;
    }

    const location = parseS3Location(uri);
    if (!location) {
      return null;
    }

    const cacheKey = `${location.bucket}/${location.key}`;
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey) ?? null;
    }

    try {
      const signedUrl = await createPresignedUrl({ bucket: location.bucket, key: location.key });
      cache.set(cacheKey, signedUrl);
      return signedUrl;
    } catch (_error) {
      cache.set(cacheKey, null);
      return null;
    }
  };
};

const buildQuestionConditions = (filters: QuestionExportFilters) => {
  const conditions: Prisma.Sql[] = [];

  if (typeof filters.classId === "number") {
    conditions.push(sql`class = ${filters.classId}`);
  }

  if (filters.subjectId) {
    conditions.push(sql`question_id IN (SELECT id FROM questions WHERE subject_id = ${filters.subjectId})`);
  }

  if (filters.chapterId) {
    conditions.push(sql`question_id IN (SELECT id FROM questions WHERE chapter_id = ${filters.chapterId})`);
  }

  if (filters.pageNumber) {
    conditions.push(sql`page = ${filters.pageNumber}`);
  }

  if (filters.status) {
    conditions.push(sql`status = ${filters.status}`);
  }

  return conditions;
};

const buildQuestionBankConditions = (filters: QuestionBankExportFilters) => {
  const conditions: Prisma.Sql[] = [];

  if (typeof filters.classId === "number") {
    conditions.push(sql`class = ${filters.classId}`);
  }

  if (filters.subjectId) {
    conditions.push(
      sql`question_bank_id IN (SELECT id FROM question_bank WHERE subject_id = ${filters.subjectId})`
    );
  }

  if (filters.chapterId) {
    conditions.push(
      sql`question_bank_id IN (SELECT id FROM question_bank WHERE chapter_id = ${filters.chapterId})`
    );
  }

  if (filters.pageNumber) {
    conditions.push(sql`page = ${filters.pageNumber}`);
  }

  return conditions;
};

const buildWhereClause = (conditions: Prisma.Sql[]) =>
  conditions.length > 0 ? sql`WHERE ${join(conditions, sql` AND `)}` : empty;

const queryQuestionRows = async (
  filters: QuestionExportFilters,
  options: QueryOptions = {}
): Promise<RawQuestionRow[]> => {
  const conditions = buildQuestionConditions(filters);
  const whereClause = buildWhereClause(conditions);
  const limitClause = options.limit !== undefined ? sql`LIMIT ${options.limit}` : empty;
  const offsetClause = options.offset !== undefined ? sql`OFFSET ${options.offset}` : empty;

  const rows = await prisma.$queryRaw<RawQuestionRow[]>(sql`
    SELECT *
    FROM v_export_questions
    ${whereClause}
    ORDER BY created_at DESC
    ${limitClause}
    ${offsetClause}
  `);

  return rows;
};

const countQuestionRows = async (filters: QuestionExportFilters): Promise<number> => {
  const conditions = buildQuestionConditions(filters);
  const whereClause = buildWhereClause(conditions);

  const [result] = await prisma.$queryRaw<{ total: bigint }[]>(sql`
    SELECT COUNT(*)::bigint AS total
    FROM v_export_questions
    ${whereClause}
  `);

  return result ? Number(result.total) : 0;
};

const queryQuestionBankRows = async (
  filters: QuestionBankExportFilters
): Promise<RawQuestionBankRow[]> => {
  const conditions = buildQuestionBankConditions(filters);
  const whereClause = buildWhereClause(conditions);

  const rows = await prisma.$queryRaw<RawQuestionBankRow[]>(sql`
    SELECT *
    FROM v_export_question_bank
    ${whereClause}
    ORDER BY created_at DESC
  `);

  return rows;
};

const mapQuestionRow = async (
  row: RawQuestionRow,
  loadSignedUrl: (uri: string | null) => Promise<string | null>
): Promise<QuestionExportRow> => ({
  questionId: row.question_id,
  classId: Number(row.class),
  subjectName: row.subject,
  chapterName: row.chapter,
  pageNumber: Number(row.page),
  language: row.language,
  difficulty: (row.difficulty as QuestionExportRow["difficulty"]) ?? null,
  stem: row.stem,
  optionA: row.option_a,
  optionB: row.option_b,
  optionC: row.option_c,
  optionD: row.option_d,
  correctOption: row.correct_option,
  explanation: row.explanation,
  status: row.status as QuestionStatus,
  createdAt: toIsoString(row.created_at),
  sourcePageImageUrl: await loadSignedUrl(row.source_page_image_url)
});

const mapQuestionBankRow = async (
  row: RawQuestionBankRow,
  loadSignedUrl: (uri: string | null) => Promise<string | null>
): Promise<QuestionBankExportRow> => ({
  questionBankId: row.question_bank_id,
  subjectShortCode: row.subj_short_code,
  sequenceNumber: row.seq_no ?? null,
  classId: Number(row.class),
  subjectName: row.subject,
  chapterName: row.chapter,
  pageNumber: row.page ?? null,
  language: row.language,
  difficulty: (row.difficulty as QuestionBankExportRow["difficulty"]) ?? null,
  stem: row.stem,
  optionA: row.option_a,
  optionB: row.option_b,
  optionC: row.option_c,
  optionD: row.option_d,
  correctOption: row.correct_option,
  explanation: row.explanation,
  createdAt: toIsoString(row.created_at),
  sourcePageImageUrl: await loadSignedUrl(row.source_page_image_url)
});

type CsvColumn<T> = {
  header: string;
  accessor: (row: T) => string | number | null | undefined;
};

const toCsvValue = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
};

const escapeCsvValue = (value: string) => {
  if (value.includes(",") || value.includes("\n") || value.includes("\"")) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
};

const buildCsv = <T>(rows: T[], columns: CsvColumn<T>[]) => {
  const header = columns.map((column) => column.header).join(",");
  const body = rows
    .map((row) =>
      columns
        .map((column) => escapeCsvValue(toCsvValue(column.accessor(row))))
        .join(",")
    )
    .join("\n");

  return body ? `${header}\n${body}` : `${header}\n`;
};

const questionColumns: CsvColumn<QuestionExportRow>[] = [
  { header: "question_id", accessor: (row) => row.questionId },
  { header: "class", accessor: (row) => row.classId },
  { header: "subject", accessor: (row) => row.subjectName },
  { header: "chapter", accessor: (row) => row.chapterName },
  { header: "page", accessor: (row) => row.pageNumber },
  { header: "language", accessor: (row) => row.language },
  { header: "difficulty", accessor: (row) => row.difficulty },
  { header: "stem", accessor: (row) => row.stem },
  { header: "option_a", accessor: (row) => row.optionA },
  { header: "option_b", accessor: (row) => row.optionB },
  { header: "option_c", accessor: (row) => row.optionC },
  { header: "option_d", accessor: (row) => row.optionD },
  { header: "correct_option", accessor: (row) => row.correctOption },
  { header: "explanation", accessor: (row) => row.explanation },
  { header: "status", accessor: (row) => row.status },
  { header: "created_at", accessor: (row) => row.createdAt },
  { header: "source_page_image_url", accessor: (row) => row.sourcePageImageUrl }
];

const questionBankColumns: CsvColumn<QuestionBankExportRow>[] = [
  { header: "question_bank_id", accessor: (row) => row.questionBankId },
  { header: "subj_short_code", accessor: (row) => row.subjectShortCode },
  { header: "seq_no", accessor: (row) => row.sequenceNumber },
  { header: "class", accessor: (row) => row.classId },
  { header: "subject", accessor: (row) => row.subjectName },
  { header: "chapter", accessor: (row) => row.chapterName },
  { header: "page", accessor: (row) => row.pageNumber },
  { header: "language", accessor: (row) => row.language },
  { header: "difficulty", accessor: (row) => row.difficulty },
  { header: "stem", accessor: (row) => row.stem },
  { header: "option_a", accessor: (row) => row.optionA },
  { header: "option_b", accessor: (row) => row.optionB },
  { header: "option_c", accessor: (row) => row.optionC },
  { header: "option_d", accessor: (row) => row.optionD },
  { header: "correct_option", accessor: (row) => row.correctOption },
  { header: "explanation", accessor: (row) => row.explanation },
  { header: "created_at", accessor: (row) => row.createdAt },
  { header: "source_page_image_url", accessor: (row) => row.sourcePageImageUrl }
];

export const getQuestionExportData = async (
  filters: QuestionExportFilters
): Promise<QuestionExportResponse> => {
  const rows = await queryQuestionRows(filters);
  const loadSignedUrl = createSignedUrlLoader();
  const items = await Promise.all(rows.map((row) => mapQuestionRow(row, loadSignedUrl)));

  return { items };
};

export const getQuestionExportCsv = async (filters: QuestionExportFilters) => {
  const { items } = await getQuestionExportData(filters);
  return buildCsv(items, questionColumns);
};

export const getQuestionBankExportData = async (
  filters: QuestionBankExportFilters
): Promise<QuestionBankExportResponse> => {
  const rows = await queryQuestionBankRows(filters);
  const loadSignedUrl = createSignedUrlLoader();
  const items = await Promise.all(rows.map((row) => mapQuestionBankRow(row, loadSignedUrl)));

  return { items };
};

export const getQuestionBankExportCsv = async (filters: QuestionBankExportFilters) => {
  const { items } = await getQuestionBankExportData(filters);
  return buildCsv(items, questionBankColumns);
};

export const getApprovedQuestionsForInternalApi = async (
  filters: InternalApprovedQuestionsQuery
): Promise<InternalApprovedQuestionsResponse> => {
  const effectiveFilters: QuestionExportFilters = {
    ...filters,
    status: "approved"
  };

  const [rows, total] = await Promise.all([
    queryQuestionRows(effectiveFilters, { limit: filters.limit, offset: filters.offset }),
    countQuestionRows(effectiveFilters)
  ]);

  const loadSignedUrl = createSignedUrlLoader();
  const items = await Promise.all(rows.map((row) => mapQuestionRow(row, loadSignedUrl)));

  return {
    items,
    meta: {
      total,
      limit: filters.limit ?? total,
      offset: filters.offset ?? 0
    }
  };
};
