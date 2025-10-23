import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

import { env } from "@/config";
import { logger } from "@/lib/logger";

const connection = new IORedis(env.REDIS_URL);

const generationQueue = new Queue("generation", { connection });

const worker = new Worker(
  "generation",
  async (job) => {
    logger.info({ jobId: job.id }, "Processing generation job");
    // TODO: implement generation pipeline logic
  },
  {
    connection,
    concurrency: env.WORKER_CONCURRENCY
  }
);

worker.on("completed", (job) => {
  logger.info({ jobId: job.id }, "Job completed");
});

worker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err }, "Job failed");
});

void generationQueue.waitUntilReady().then(() => {
  logger.info("Worker connected to Redis queue");
});

