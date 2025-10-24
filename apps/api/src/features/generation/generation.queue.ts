import { Queue } from "bullmq";
import IORedis from "ioredis";

import { env } from "@/config";

import type { QueueMetricDto } from "@quizgen/shared";

export type GenerationJobData = {
  pageId: string;
};

export type GenerationJobInput = GenerationJobData & {
  delayMs?: number;
};

const queueName = "generation";

const buildDefaultMetrics = (): QueueMetricDto => ({
  name: queueName,
  waiting: 0,
  active: 0,
  delayed: 0,
  failed: 0,
  completed: 0,
  paused: false,
});

let queue: Queue<GenerationJobData> | null = null;

const getQueue = () => {
  if (env.NODE_ENV === "test") {
    return null;
  }

  if (!queue) {
    const connection = new IORedis(env.REDIS_URL, { lazyConnect: true });
    queue = new Queue<GenerationJobData>(queueName, { connection });
  }

  return queue;
};

export const enqueueGenerationJobs = async (jobs: GenerationJobInput[]) => {
  if (jobs.length === 0) {
    return;
  }

  const activeQueue = getQueue();

  if (!activeQueue) {
    return;
  }

  await activeQueue.addBulk(
    jobs.map((job) => ({
      name: `page:${job.pageId}`,
      data: { pageId: job.pageId },
      opts: {
        jobId: `page:${job.pageId}:${Date.now()}`,
        delay: job.delayMs ?? 0,
        removeOnComplete: true,
        removeOnFail: false,
      },
    }))
  );
};

export const getGenerationQueueMetrics = async (): Promise<QueueMetricDto> => {
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

export const closeGenerationQueue = async () => {
  if (queue) {
    await queue.close();
    queue = null;
  }
};
