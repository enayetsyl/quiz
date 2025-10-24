import { Router } from "express";

import { authRoutes } from "./auth/auth.route";
import { healthRoutes } from "./health/health.route";
import { settingsRoutes } from "./settings/settings.route";
import { usersRoutes } from "./users/users.route";

export const registerFeatureRoutes = () => {
  const router = Router();

  router.use("/health", healthRoutes);
  router.use("/auth", authRoutes);
  router.use("/settings", settingsRoutes);
  router.use("/users", usersRoutes);

  return router;
};

