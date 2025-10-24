import os from "node:os";

import { env } from "@/config";

import type { HealthCheckResponse } from "@quizgen/shared";

export const getHealthStatus = (showDetails = false): HealthCheckResponse => {
  const payload: HealthCheckResponse = {
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "quiz-generator-api"
  };

  if (showDetails) {
    payload.info = {
      environment: env.NODE_ENV,
      uptimeSeconds: process.uptime(),
      hostname: os.hostname()
    };
  }

  return payload;
};

