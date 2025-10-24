import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

import { env } from "@/config";
import type { RasterizationJobData } from "@/features/uploads/rasterization.queue";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { uploadToS3 } from "@/utils/s3";

import { PageStatus } from "@prisma/client";

const connection = new IORedis(env.REDIS_URL);

const generationQueue = new Queue("generation", { connection });
const rasterizationQueue = new Queue("rasterization", { connection });

const placeholderPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=",
  "base64"
);
const placeholderJpeg = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxISEhUTEhIVFRUVFRUVFRUVFRUVFRUXFhUXFxUYHSggGBolGxUXITEhJSkrLi4uFx8zODMtNygtLisBCgoKDg0OGxAQGy0lHyUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAKABJQMBIgACEQEDEQH/xAAbAAEAAgMBAQAAAAAAAAAAAAAABQYDBAcCAf/EADkQAAIBAwMCBAMGBQQDAQAAAAECAwAEEQUSITFBUQYiYXETMoGRobHB0RQjQlKy0fAVM1NicoLxU5LSJHSF/8QAGAEAAwEBAAAAAAAAAAAAAAAAAAECAwT/xAAiEQEBAAICAgEFAAAAAAAAAAAAAQIRAyExEkEEE1EFIlH/2gAMAwEAAhEDEQA/APWiiigAooooAKKKKACiiigAooooAKKKKAP/Z",
  "base64"
);

const generationWorker = new Worker(
  "generation",
  async (job) => {
    logger.info({ jobId: job.id }, "Processing generation job");
    // TODO: implement generation pipeline logic
  },
  {
    connection,
    concurrency: env.WORKER_CONCURRENCY,
  }
);

generationWorker.on("completed", (job) => {
  logger.info({ jobId: job.id }, "Generation job completed");
});

generationWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err }, "Generation job failed");
});

const rasterizationWorker = new Worker<RasterizationJobData>(
  "rasterization",
  async (job) => {
    logger.info({ jobId: job.id, uploadId: job.data.uploadId }, "Rasterizing page");

    await uploadToS3({
      bucket: job.data.bucket,
      key: job.data.pngKey,
      body: placeholderPng,
      contentType: "image/png",
    });

    await uploadToS3({
      bucket: job.data.bucket,
      key: job.data.thumbKey,
      body: placeholderJpeg,
      contentType: "image/jpeg",
    });

    await prisma.page.update({
      where: { id: job.data.pageId },
      data: {
        status: PageStatus.complete,
        updatedAt: new Date(),
      },
    });
  },
  {
    connection,
    concurrency: env.WORKER_CONCURRENCY,
  }
);

rasterizationWorker.on("completed", (job) => {
  logger.info({ jobId: job.id }, "Rasterization job completed");
});

rasterizationWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err }, "Rasterization job failed");
});

void Promise.all([
  generationQueue.waitUntilReady(),
  rasterizationQueue.waitUntilReady(),
]).then(() => {
  logger.info("Worker connected to Redis queues");
});

const gracefulShutdown = async (signal: NodeJS.Signals) => {
  logger.info({ signal }, "Shutting down worker");
  try {
    await generationWorker.close();
    await rasterizationWorker.close();
    await generationQueue.close();
    await rasterizationQueue.close();
    await connection.quit();
    logger.info("Queue connections closed");
  } catch (error) {
    logger.error({ error }, "Failed to close queue resources");
  }

  try {
    await prisma.$disconnect();
    logger.info("Database connection closed");
  } catch (error) {
    logger.error({ error }, "Failed to disconnect Prisma client");
  }

  process.exit(0);
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

