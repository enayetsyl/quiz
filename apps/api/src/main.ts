import { createServer } from "http";

import { env } from "@/config";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

import { createApp } from "./app";

const PORT = env.PORT;

const app = createApp();
const server = createServer(app);

server.listen(PORT, () => {
  logger.info(`API listening on http://localhost:${PORT}`);
});

const shutdown = (signal: NodeJS.Signals) => {
  logger.info({ signal }, "Shutting down server");
  server.close(async () => {
    logger.info("HTTP server closed");
    try {
      await prisma.$disconnect();
      logger.info("Database connection closed");
    } catch (error) {
      logger.error({ error }, "Failed to disconnect Prisma client");
    }
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

