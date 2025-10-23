import cors from "cors";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";

import { appName } from "@quizgen/shared";

import { healthRouter } from "./routes/health";

export const createApp = (): Express => {
  const app = express();
  app.set("name", appName);

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));

  app.get("/healthz", (_, res) => res.status(200).json({ status: "ok" }));
  app.use("/api/health", healthRouter);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    // Basic error handler placeholder
    res.status(500).json({ message: err instanceof Error ? err.message : "Unknown error" });
  });

  return app;
};
