import { randomUUID } from "node:crypto";

import { StatusCodes } from "http-status-codes";

import { PageStatus, Prisma } from "@prisma/client";

import { env } from "@/config";
import type { AuthenticatedUser } from "@/features/auth/auth.service";
import { ApiError } from "@/lib/apiError";
import { prisma } from "@/lib/prisma";
import { createPresignedUrl, uploadToS3 } from "@/utils/s3";

import type {
  UploadListQuery,
  UploadPageDto,
  UploadResponse,
  UploadSummaryDto,
} from "@quizgen/shared";

import { enqueueRasterizationJobs, type RasterizationJobData } from "./rasterization.queue";
import type { UploadMetadataInput } from "./uploads.schema";

const MAX_PAGES_PER_UPLOAD = 100;

const buildPageKeys = (uploadId: string, pageNumber: number) => {
  const padded = pageNumber.toString().padStart(4, "0");
  return {
    pngKey: `uploads/${uploadId}/pages/${padded}.png`,
    thumbKey: `uploads/${uploadId}/pages/${padded}_thumb.jpg`,
  };
};

const mapPageToDto = async (
  page: {
    id: string;
    pageNumber: number;
    status: PageStatus;
    s3PngKey: string;
    s3ThumbKey: string;
    updatedAt: Date;
  },
  bucket: string
): Promise<UploadPageDto> => {
  const isReady = page.status === PageStatus.complete;

  const [pngUrl, thumbnailUrl] = await Promise.all([
    isReady ? createPresignedUrl({ bucket, key: page.s3PngKey }) : Promise.resolve(null),
    isReady ? createPresignedUrl({ bucket, key: page.s3ThumbKey }) : Promise.resolve(null),
  ]);

  return {
    id: page.id,
    pageNumber: page.pageNumber,
    status: page.status,
    pngUrl,
    thumbnailUrl,
    updatedAt: page.updatedAt.toISOString(),
  };
};

const mapUploadToResponse = async (
  upload: {
    id: string;
    classId: number;
    subjectId: string;
    chapterId: string;
    uploadedBy: string | null;
    originalFilename: string;
    mimeType: string;
    s3Bucket: string;
    s3PdfKey: string;
    pagesCount: number;
    createdAt: Date;
    pages: {
      id: string;
      pageNumber: number;
      status: PageStatus;
      s3PngKey: string;
      s3ThumbKey: string;
      updatedAt: Date;
    }[];
  }
): Promise<UploadResponse> => {
  const pdfUrl = await createPresignedUrl({ bucket: upload.s3Bucket, key: upload.s3PdfKey });

  const pages = await Promise.all(
    upload.pages
      .slice()
      .sort((a, b) => a.pageNumber - b.pageNumber)
      .map((page) => mapPageToDto(page, upload.s3Bucket))
  );

  return {
    id: upload.id,
    classId: upload.classId,
    subjectId: upload.subjectId,
    chapterId: upload.chapterId,
    originalFilename: upload.originalFilename,
    mimeType: upload.mimeType,
    pagesCount: upload.pagesCount,
    createdAt: upload.createdAt.toISOString(),
    pdfUrl,
    pages,
  };
};

const mapUploadToSummary = async (
  upload: {
    id: string;
    chapterId: string;
    originalFilename: string;
    pagesCount: number;
    createdAt: Date;
    s3Bucket: string;
    s3PdfKey: string;
    pages: { status: PageStatus }[];
  }
): Promise<UploadSummaryDto> => {
  const completedPages = upload.pages.filter((page) => page.status === PageStatus.complete).length;
  const pdfUrl = await createPresignedUrl({ bucket: upload.s3Bucket, key: upload.s3PdfKey });

  return {
    id: upload.id,
    chapterId: upload.chapterId,
    originalFilename: upload.originalFilename,
    createdAt: upload.createdAt.toISOString(),
    pagesCount: upload.pagesCount,
    completedPages,
    pdfUrl,
  };
};

const countPdfPages = (buffer: Buffer) => {
  const content = buffer.toString("latin1");
  const matches = content.match(/\/Type\s*\/Page\b/g);
  if (!matches) {
    return 0;
  }

  return matches.length;
};

export const validatePdfAndExtractPageCount = (file: Express.Multer.File) => {
  const isPdf = file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Only PDF files are supported");
  }

  const pageCount = countPdfPages(file.buffer);
  if (pageCount === 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Could not detect any pages in the provided PDF");
  }

  if (pageCount > MAX_PAGES_PER_UPLOAD) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `PDF exceeds the maximum allowed page count of ${MAX_PAGES_PER_UPLOAD}`
    );
  }

  return pageCount;
};

export const createUpload = async ({
  metadata,
  file,
  pageCount,
  authUser,
}: {
  metadata: UploadMetadataInput;
  file: Express.Multer.File;
  pageCount: number;
  authUser: AuthenticatedUser;
}): Promise<UploadResponse> => {
  if (!env.S3_BUCKET_UPLOADS) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Upload bucket is not configured");
  }

  const chapter = await prisma.chapter.findUnique({
    where: { id: metadata.chapterId },
    include: { subject: true },
  });

  if (!chapter || chapter.subjectId !== metadata.subjectId || chapter.subject.classId !== metadata.classId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "The selected chapter does not match the chosen subject or class");
  }

  const uploadId = randomUUID();
  const pdfKey = `uploads/${uploadId}/source.pdf`;

  await uploadToS3({
    bucket: env.S3_BUCKET_UPLOADS,
    key: pdfKey,
    body: file.buffer,
    contentType: file.mimetype,
  });

  const pagesData = Array.from({ length: pageCount }, (_, index) => {
    const pageNumber = index + 1;
    const { pngKey, thumbKey } = buildPageKeys(uploadId, pageNumber);

    return {
      id: randomUUID(),
      uploadId,
      pageNumber,
      status: PageStatus.queued,
      s3PngKey: pngKey,
      s3ThumbKey: thumbKey,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  const uploadRecord = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const createdUpload = await tx.upload.create({
      data: {
        id: uploadId,
        classId: metadata.classId,
        subjectId: metadata.subjectId,
        chapterId: metadata.chapterId,
        uploadedBy: authUser.id,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        s3Bucket: env.S3_BUCKET_UPLOADS,
        s3PdfKey: pdfKey,
        pagesCount: pageCount,
        fileMeta: {
          size: file.size,
          pageCount,
          originalFilename: file.originalname,
        },
      },
    });

    await tx.page.createMany({
      data: pagesData.map((page) => ({
        id: page.id,
        uploadId: page.uploadId,
        pageNumber: page.pageNumber,
        status: page.status,
        s3PngKey: page.s3PngKey,
        s3ThumbKey: page.s3ThumbKey,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
      })),
    });

    return createdUpload;
  });

  const jobs: RasterizationJobData[] = pagesData.map((page) => ({
    uploadId,
    pageId: page.id,
    pageNumber: page.pageNumber,
    bucket: env.S3_BUCKET_UPLOADS,
    pdfKey,
    pngKey: page.s3PngKey,
    thumbKey: page.s3ThumbKey,
  }));

  await enqueueRasterizationJobs(jobs);

  return mapUploadToResponse({
    ...uploadRecord,
    pages: pagesData,
  });
};

export const getUploadById = async (uploadId: string): Promise<UploadResponse> => {
  const upload = await prisma.upload.findUnique({
    where: { id: uploadId },
    include: {
      pages: true,
    },
  });

  if (!upload) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Upload not found");
  }

  return mapUploadToResponse(upload);
};

export const listUploadsByChapter = async (
  query: UploadListQuery
): Promise<UploadSummaryDto[]> => {
  const uploads = await prisma.upload.findMany({
    where: { chapterId: query.chapterId },
    include: { pages: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return Promise.all(uploads.map((upload) => mapUploadToSummary(upload)));
};

