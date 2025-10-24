import { vi } from "vitest";

vi.mock("@prisma/client", () => ({
  Prisma: {
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
    join: (parts: unknown[], separator: unknown) => ({ parts, separator }),
    empty: { strings: [], values: [] }
  },
  PageStatus: {
    pending: "pending",
    queued: "queued",
    generating: "generating",
    complete: "complete",
    failed: "failed",
  },
  QuestionStatus: {
    not_checked: "not_checked",
  },
  DifficultyLevel: {
    easy: "easy",
    medium: "medium",
    hard: "hard",
  },
  OptionKey: {
    a: "a",
    b: "b",
    c: "c",
    d: "d",
  },
  LanguageCode: {
    en: "en",
    bn: "bn",
  },
  UserRole: {
    admin: "admin",
    approver: "approver",
  },
}));

const prismaMock = vi.hoisted(() => {
  const upload = {
    findUnique: vi.fn(),
  };

  const page = {
    findMany: vi.fn(),
    updateMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  };

  const pageGenerationAttempt = {
    create: vi.fn(),
    update: vi.fn(),
  };

  const question = {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
    findFirst: vi.fn(),
  };

  const llmUsageEvent = {
    create: vi.fn(),
  };

  return {
    upload,
    page,
    pageGenerationAttempt,
    question,
    llmUsageEvent,
    $transaction: vi.fn(async (callback: (client: typeof prismaMock) => unknown) => {
      return callback(prismaMock);
    }),
  };
});

vi.mock("../src/lib/prisma", () => ({
  prisma: prismaMock,
}));

const createPresignedUrl = vi.hoisted(() => vi.fn());
vi.mock("../src/utils/s3", () => ({
  createPresignedUrl,
}));

const enqueueGenerationJobs = vi.hoisted(() => vi.fn());
vi.mock("../src/features/generation/generation.queue", () => ({
  enqueueGenerationJobs,
}));

const geminiGenerate = vi.hoisted(() => vi.fn());
vi.mock("../src/features/generation/gemini.client", () => ({
  geminiClient: { generateQuestions: geminiGenerate },
}));

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  getGenerationOverview,
  processGenerationAttempt,
  regeneratePage,
  retryFailedPage,
  scheduleRetry,
  startUploadGeneration,
} from "../src/features/generation/generation.service";
import { PageStatus } from "@prisma/client";

describe("generation service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createPresignedUrl.mockResolvedValue("https://signed.example");
    prismaMock.question.findFirst.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns generation overview with mapped attempts", async () => {
    prismaMock.upload.findUnique.mockResolvedValue({
      id: "upload-1",
      chapterId: "chapter-1",
      originalFilename: "chapter.pdf",
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      pagesCount: 1,
      s3Bucket: "uploads",
      pages: [
        {
          id: "page-1",
          pageNumber: 1,
          status: PageStatus.complete,
          language: "en",
          lastGeneratedAt: new Date("2024-01-02T00:00:00.000Z"),
          s3PngKey: "uploads/page.png",
          s3ThumbKey: "uploads/thumb.jpg",
          updatedAt: new Date("2024-01-02T00:00:00.000Z"),
          _count: { questions: 3 },
          pageGenerationAttempts: [
            {
              id: "attempt-1",
              attemptNo: 1,
              model: "gemini",
              promptVersion: "v1",
              isSuccess: true,
              errorMessage: null,
              requestExcerpt: "prompt",
              responseExcerpt: "response",
              createdAt: new Date("2024-01-02T00:00:00.000Z"),
            },
          ],
        },
      ],
    });

    const overview = await getGenerationOverview("upload-1");

    expect(overview.pages).toHaveLength(1);
    expect(overview.statusCounts.complete).toBe(1);
    expect(overview.pages[0].attempts[0].id).toBe("attempt-1");
    expect(createPresignedUrl).toHaveBeenCalledTimes(2);
  });

  it("queues pending pages when starting generation", async () => {
    prismaMock.page.findMany.mockResolvedValue([{ id: "page-1" }, { id: "page-2" }]);
    prismaMock.page.updateMany.mockResolvedValue({ count: 2 });
    prismaMock.upload.findUnique.mockResolvedValue({
      id: "upload-1",
      chapterId: "chapter-1",
      originalFilename: "chapter.pdf",
      createdAt: new Date(),
      pagesCount: 0,
      s3Bucket: "uploads",
      pages: [],
    });

    await startUploadGeneration("upload-1", {
      id: "user-1",
      email: "user@example.com",
      role: "admin",
      isActive: true,
      lastLoginAt: null,
    });

    expect(prismaMock.page.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["page-1", "page-2"] } },
      data: expect.objectContaining({ status: PageStatus.queued }),
    });
    expect(enqueueGenerationJobs).toHaveBeenCalledWith([
      { pageId: "page-1" },
      { pageId: "page-2" },
    ]);
  });

  it("processes generation attempts and stores success output", async () => {
    prismaMock.page.findUnique.mockResolvedValue({
      id: "page-1",
      uploadId: "upload-1",
      pageNumber: 3,
      language: "en",
      upload: {
        id: "upload-1",
        classId: 6,
        subjectId: "subject-1",
        chapterId: "chapter-1",
      },
      pageGenerationAttempts: [],
    });

    prismaMock.page.update.mockResolvedValue({});
    prismaMock.pageGenerationAttempt.create.mockResolvedValue({
      id: "attempt-1",
    });

    geminiGenerate.mockResolvedValue({
      questions: [
        {
          lineIndex: 0,
          stem: "Question 1",
          difficulty: "easy",
          explanation: "Explain",
          correctOption: "a",
          options: [
            { key: "a", text: "Correct" },
            { key: "b", text: "B" },
            { key: "c", text: "C" },
            { key: "d", text: "D" },
          ],
        },
      ],
      language: "en",
      tokensIn: 100,
      tokensOut: 200,
    });

    await processGenerationAttempt("page-1", {
      scheduleRetry: vi.fn(),
    });

    expect(prismaMock.question.createMany).toHaveBeenCalled();
    expect(prismaMock.page.update).toHaveBeenCalledWith({
      where: { id: "page-1" },
      data: expect.objectContaining({ status: PageStatus.complete }),
    });
    expect(prismaMock.pageGenerationAttempt.update).toHaveBeenCalledWith({
      where: { id: "attempt-1" },
      data: expect.objectContaining({ isSuccess: true }),
    });
    expect(prismaMock.llmUsageEvent.create).toHaveBeenCalled();
  });

  it("schedules retries when generation fails", async () => {
    prismaMock.page.findUnique.mockResolvedValue({
      id: "page-1",
      uploadId: "upload-1",
      pageNumber: 1,
      language: "en",
      upload: {
        id: "upload-1",
        classId: 6,
        subjectId: "subject-1",
        chapterId: "chapter-1",
      },
      pageGenerationAttempts: [],
    });

    prismaMock.pageGenerationAttempt.create.mockResolvedValue({ id: "attempt-1" });
    prismaMock.page.update.mockResolvedValue({});
    geminiGenerate.mockRejectedValue(new Error("LLM error"));

    const schedule = vi.fn();

    await processGenerationAttempt("page-1", { scheduleRetry: schedule });

    expect(prismaMock.pageGenerationAttempt.update).toHaveBeenCalledWith({
      where: { id: "attempt-1" },
      data: expect.objectContaining({ errorMessage: "LLM error" }),
    });
    expect(schedule).toHaveBeenCalledWith("page-1", 1);
  });

  it("requeues failed pages", async () => {
    prismaMock.page.findUnique.mockResolvedValueOnce({
      id: "page-1",
      uploadId: "upload-1",
      status: PageStatus.failed,
    });

    prismaMock.upload.findUnique.mockResolvedValue({
      id: "upload-1",
      chapterId: "chapter-1",
      originalFilename: "chapter.pdf",
      createdAt: new Date(),
      pagesCount: 0,
      s3Bucket: "uploads",
      pages: [],
    });

    await retryFailedPage("page-1");

    expect(prismaMock.page.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["page-1"] } },
      data: expect.objectContaining({ status: PageStatus.queued }),
    });
    expect(enqueueGenerationJobs).toHaveBeenCalledWith([{ pageId: "page-1" }]);
  });

  it("computes retry delay with jitter", async () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.2);

    await scheduleRetry("page-1", 1);

    expect(enqueueGenerationJobs).toHaveBeenCalledWith([
      { pageId: "page-1", delayMs: 5000 + 200 },
    ]);

    randomSpy.mockRestore();
  });

  it("prevents regeneration when a page contains locked questions", async () => {
    prismaMock.page.findUnique.mockResolvedValueOnce({
      id: "page-locked",
      uploadId: "upload-locked",
    });
    prismaMock.question.findFirst.mockResolvedValueOnce({ id: "question-locked" });

    await expect(regeneratePage("page-locked")).rejects.toThrow(
      "This page contains questions already published to the Question Bank",
    );
  });
});
