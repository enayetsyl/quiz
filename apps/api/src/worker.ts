import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379");

const generationQueue = new Queue("generation", { connection });

// Placeholder processor – replace with real implementation later
const worker = new Worker(
  "generation",
  async (job) => {
    // eslint-disable-next-line no-console
    console.log(`Processing job ${job.id} with data`, job.data);
  },
  {
    connection,
    concurrency: Number(process.env.WORKER_CONCURRENCY ?? "5")
  }
);

worker.on("completed", (job) => {
  // eslint-disable-next-line no-console
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  // eslint-disable-next-line no-console
  console.error(`Job ${job?.id} failed`, err);
});

void generationQueue.waitUntilReady().then(() => {
  // eslint-disable-next-line no-console
  console.log("Worker connected to Redis queue");
});

