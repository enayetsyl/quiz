import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "@/config";
import { registerFeatureRoutes } from "@/features";
import { healthCheck } from "@/features/health/health.controller";
import { logger } from "@/lib/logger";
import { errorHandler } from "@/middlewares/errorHandler";
import { notFoundHandler } from "@/middlewares/notFoundHandler";

import { appName } from "@quizgen/shared";

export const createApp = (): Express => {
  const app = express();
  app.set("name", appName);
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.NODE_ENV === "development" ? true : /quizgen/i,
      credentials: true
    })
  );
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  if (env.NODE_ENV !== "test") {
    app.use(
      morgan("combined", {
        stream: {
          write: (message) => logger.info(message.trim())
        }
      })
    );
  }

  app.get("/healthz", healthCheck);
  app.use("/api", registerFeatureRoutes());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
