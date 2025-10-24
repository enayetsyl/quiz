import { Router } from "express";

import { UserRole } from "@prisma/client";

import { requireAuth, requireRole } from "@/features/auth/auth.middleware";

import { getSettings, rotateApiToken, updateSettings } from "./settings.controller";

const router = Router();

router.get("/", requireAuth, getSettings);
router.put("/", requireRole([UserRole.admin]), updateSettings);
router.post("/rotate-api-token", requireRole([UserRole.admin]), rotateApiToken);

export const settingsRoutes = router;
