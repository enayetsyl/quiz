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
  UserRole: {
    admin: "admin",
    approver: "approver",
  },
}));

const prismaMock = vi.hoisted(() => {
  const upload = {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
  };

  const page = {
    createMany: vi.fn(),
  };

  return {
    user: {
      findUnique: vi.fn(),
    },
    chapter: {
      findUnique: vi.fn(),
    },
    upload,
    page,
    $transaction: vi.fn(async (callback: (tx: { upload: typeof upload; page: typeof page }) => unknown) => {
      return callback({
        upload,
        page,
      });
    }),
  };
});

vi.mock("../src/lib/prisma", () => ({
  prisma: prismaMock,
}));

const uploadToS3 = vi.hoisted(() => vi.fn());
const createPresignedUrl = vi.hoisted(() => vi.fn());
vi.mock("../src/utils/s3", () => ({
  uploadToS3,
  createPresignedUrl,
}));

const enqueueRasterizationJobs = vi.hoisted(() => vi.fn());
vi.mock("../src/features/uploads/rasterization.queue", () => ({
  enqueueRasterizationJobs,
}));

import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../src/app";
import { env } from "../src/config";
import { createAuthToken } from "../src/utils/token";
import { PageStatus } from "@prisma/client";

describe("uploads feature", () => {
  const adminUser = {
    id: "admin-1",
    email: "admin@example.com",
    role: "admin" as const,
    isActive: true,
  };

  const chapterId = "11111111-1111-4111-8111-111111111111";
  const subjectId = "22222222-2222-4222-8222-222222222222";

  beforeEach(() => {
    vi.clearAllMocks();
    createPresignedUrl.mockResolvedValue("https://example.com/signed");
    prismaMock.user.findUnique.mockResolvedValue(adminUser);
    prismaMock.chapter.findUnique.mockResolvedValue({
      id: chapterId,
      subjectId,
      subject: { classId: 6 },
    });
    prismaMock.upload.create.mockResolvedValue({
      id: "upload-1",
      classId: 6,
      subjectId,
      chapterId,
      uploadedBy: adminUser.id,
      originalFilename: "test.pdf",
      mimeType: "application/pdf",
      s3Bucket: env.S3_BUCKET_UPLOADS,
      s3PdfKey: "uploads/upload-1/source.pdf",
      pagesCount: 2,
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
    });
    prismaMock.upload.findUnique.mockResolvedValue({
      id: "upload-1",
      classId: 6,
      subjectId,
      chapterId,
      uploadedBy: adminUser.id,
      originalFilename: "test.pdf",
      mimeType: "application/pdf",
      s3Bucket: env.S3_BUCKET_UPLOADS,
      s3PdfKey: "uploads/upload-1/source.pdf",
      pagesCount: 2,
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      pages: [
        {
          id: "page-1",
          pageNumber: 1,
          status: PageStatus.complete,
          s3PngKey: "uploads/upload-1/pages/0001.png",
          s3ThumbKey: "uploads/upload-1/pages/0001_thumb.jpg",
          updatedAt: new Date("2024-01-01T00:00:00.000Z"),
        },
        {
          id: "page-2",
          pageNumber: 2,
          status: PageStatus.queued,
          s3PngKey: "uploads/upload-1/pages/0002.png",
          s3ThumbKey: "uploads/upload-1/pages/0002_thumb.jpg",
          updatedAt: new Date("2024-01-01T00:00:00.000Z"),
        },
      ],
    });
    prismaMock.upload.findMany.mockResolvedValue([
      {
        id: "upload-1",
        chapterId,
        originalFilename: "test.pdf",
        pagesCount: 2,
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
        s3Bucket: env.S3_BUCKET_UPLOADS,
        s3PdfKey: "uploads/upload-1/source.pdf",
        pages: [
          { status: PageStatus.complete },
          { status: PageStatus.queued },
        ],
      },
    ]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const buildToken = () => createAuthToken({ userId: adminUser.id, role: adminUser.role });

  const createPdfBuffer = (pageCount: number) => {
    const pageEntries = Array.from({ length: pageCount })
      .map((_, index) => `${index + 1} 0 obj\n<< /Type /Page >>\nendobj`)
      .join("\n");
    return Buffer.from(`%PDF-1.4\n${pageEntries}\n%%EOF`, "utf8");
  };

  it("requires a file for upload", async () => {
    const response = await request(createApp())
      .post("/api/uploads")
      .set("Cookie", [`${env.AUTH_COOKIE_NAME}=${buildToken()}`])
      .field("classId", "6")
      .field("subjectId", subjectId)
      .field("chapterId", chapterId);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("rejects non-PDF uploads", async () => {
    const response = await request(createApp())
      .post("/api/uploads")
      .set("Cookie", [`${env.AUTH_COOKIE_NAME}=${buildToken()}`])
      .field("classId", "6")
      .field("subjectId", subjectId)
      .field("chapterId", chapterId)
      .attach("file", Buffer.from("hello", "utf8"), "test.txt");

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("Only PDF files are supported");
  });

  it("rejects uploads exceeding the page limit", async () => {
    const pdf = createPdfBuffer(101);

    const response = await request(createApp())
      .post("/api/uploads")
      .set("Cookie", [`${env.AUTH_COOKIE_NAME}=${buildToken()}`])
      .field("classId", "6")
      .field("subjectId", subjectId)
      .field("chapterId", chapterId)
      .attach("file", pdf, "large.pdf");

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("maximum allowed page count");
  });

  it("creates an upload and queues rasterization jobs", async () => {
    const pdf = createPdfBuffer(2);

    const response = await request(createApp())
      .post("/api/uploads")
      .set("Cookie", [`${env.AUTH_COOKIE_NAME}=${buildToken()}`])
      .field("classId", "6")
      .field("subjectId", subjectId)
      .field("chapterId", chapterId)
      .attach("file", pdf, "test.pdf");

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(uploadToS3).toHaveBeenCalledTimes(1);
    expect(prismaMock.page.createMany).toHaveBeenCalledTimes(1);
    expect(enqueueRasterizationJobs).toHaveBeenCalled();
    expect(response.body.data.pagesCount).toBe(2);
  });

  it("returns a single upload with signed assets", async () => {
    const response = await request(createApp())
      .get("/api/uploads/upload-1")
      .set("Cookie", [`${env.AUTH_COOKIE_NAME}=${buildToken()}`]);

    expect(response.status).toBe(200);
    expect(response.body.data.pages).toHaveLength(2);
    expect(createPresignedUrl).toHaveBeenCalled();
  });

  it("lists uploads for a chapter", async () => {
    const response = await request(createApp())
      .get(`/api/uploads?chapterId=${chapterId}`)
      .set("Cookie", [`${env.AUTH_COOKIE_NAME}=${buildToken()}`]);

    expect(response.status).toBe(200);
    expect(response.body.data.uploads).toHaveLength(1);
  });
});

