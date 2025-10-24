import { Router } from "express";

import { UserRole } from "@prisma/client";

import { requireRole } from "@/features/auth/auth.middleware";

import {
  getGenerationOverviewHandler,
  regeneratePageHandler,
  retryPageGenerationHandler,
  startGenerationHandler,
} from "./generation.controller";

const router = Router();

router.use(requireRole([UserRole.admin, UserRole.approver]));

router.get("/uploads/:uploadId", getGenerationOverviewHandler);
router.post("/uploads/:uploadId/start", startGenerationHandler);
router.post("/pages/:pageId/retry", retryPageGenerationHandler);
router.post("/pages/:pageId/regenerate", regeneratePageHandler);

export const generationRoutes = router;
