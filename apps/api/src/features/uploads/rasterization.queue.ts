import { Queue } from "bullmq";
import IORedis from "ioredis";

import { env } from "@/config";

import type { QueueMetricDto } from "@quizgen/shared";

export type RasterizationJobData = {
  uploadId: string;
  pageId: string;
  pageNumber: number;
  bucket: string;
  pdfKey: string;
  pngKey: string;
  thumbKey: string;
};

const queueName = "rasterization";

const buildDefaultMetrics = (): QueueMetricDto => ({
  name: queueName,
  waiting: 0,
  active: 0,
  delayed: 0,
  failed: 0,
  completed: 0,
  paused: false,
});

let queue: Queue<RasterizationJobData> | null = null;

const getQueue = () => {
  if (env.NODE_ENV === "test") {
    return null;
  }

  if (!queue) {
    const connection = new IORedis(env.REDIS_URL, { lazyConnect: true });
    queue = new Queue<RasterizationJobData>(queueName, { connection });
  }

  return queue;
};

export const enqueueRasterizationJobs = async (jobs: RasterizationJobData[]) => {
  if (jobs.length === 0) {
    return;
  }

  const activeQueue = getQueue();

  if (!activeQueue) {
    return;
  }

  await activeQueue.addBulk(
    jobs.map((job) => ({
      name: `upload:${job.uploadId}:page:${job.pageNumber}`,
      data: job,
      removeOnComplete: true,
      removeOnFail: false,
    }))
  );
};

export const getRasterizationQueueMetrics = async (): Promise<QueueMetricDto> => {
  const activeQueue = getQueue();

  if (!activeQueue) {
    return buildDefaultMetrics();
  }

  const [counts, paused] = await Promise.all([
    activeQueue.getJobCounts("waiting", "active", "delayed", "failed", "completed"),
    activeQueue.isPaused(),
  ]);

  return {
    name: queueName,
    waiting: counts.waiting ?? 0,
    active: counts.active ?? 0,
    delayed: counts.delayed ?? 0,
    failed: counts.failed ?? 0,
    completed: counts.completed ?? 0,
    paused,
  };
};

export const closeRasterizationQueue = async () => {
  if (queue) {
    await queue.close();
    queue = null;
  }
};

