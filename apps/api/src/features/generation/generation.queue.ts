import { Queue } from "bullmq";
import IORedis from "ioredis";

import { env } from "@/config";

export type GenerationJobData = {
  pageId: string;
};

export type GenerationJobInput = GenerationJobData & {
  delayMs?: number;
};

const queueName = "generation";

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

export const closeGenerationQueue = async () => {
  if (queue) {
    await queue.close();
    queue = null;
  }
};
