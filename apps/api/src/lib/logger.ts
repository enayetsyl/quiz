import pino from "pino";

import { env } from "@/config";

export const logger = pino({
  name: "quizgen-api",
  level: env.LOG_LEVEL,
  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard"
          }
        }
      : undefined
});

