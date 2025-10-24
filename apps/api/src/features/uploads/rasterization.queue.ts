import { Queue } from "bullmq";
import IORedis from "ioredis";

import { env } from "@/config";

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

export const closeRasterizationQueue = async () => {
  if (queue) {
    await queue.close();
    queue = null;
  }
};

