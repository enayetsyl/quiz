import { Router } from "express";

import { healthRoutes } from "./health/health.route";

export const registerFeatureRoutes = () => {
  const router = Router();

  router.use("/health", healthRoutes);

  return router;
};

