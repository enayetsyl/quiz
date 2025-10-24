import { PrismaClient } from "@prisma/client";

import { env } from "@/config";
import { logger } from "@/lib/logger";

const createPrismaClient = () =>
  new PrismaClient({
    log:
      env.NODE_ENV === "development"
        ? ["query", "info", "warn", "error"]
        : ["error", "warn"]
  });

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma = globalThis.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

prisma.$on("error", (event: Record<string, unknown>) => {
  logger.error({ event }, "Prisma client error");
});

prisma.$on("warn", (event: Record<string, unknown>) => {
  logger.warn({ event }, "Prisma client warning");
});
