import { Router } from "express";

import { authRoutes } from "./auth/auth.route";
import { generationRoutes } from "./generation/generation.route";
import { healthRoutes } from "./health/health.route";
import { taxonomyRoutes } from "./taxonomy/taxonomy.route";
import { uploadRoutes } from "./uploads/uploads.route";
import { ensureDefaultClassLevels } from "./taxonomy/taxonomy.service";
import { settingsRoutes } from "./settings/settings.route";
import { usersRoutes } from "./users/users.route";

import { logger } from "@/lib/logger";

export const registerFeatureRoutes = () => {
  const router = Router();

  router.use("/health", healthRoutes);
  router.use("/auth", authRoutes);
  router.use("/settings", settingsRoutes);
  router.use("/users", usersRoutes);
  router.use("/taxonomy", taxonomyRoutes);
  router.use("/uploads", uploadRoutes);
  router.use("/generation", generationRoutes);

  void ensureDefaultClassLevels().catch((error) => {
    logger.error({ error }, "Failed to seed default class levels");
  });

  return router;
};

