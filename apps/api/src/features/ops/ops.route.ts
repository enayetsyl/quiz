import { Router } from "express";

import { UserRole } from "@prisma/client";

import { requireRole } from "@/features/auth/auth.middleware";

import { fetchOpsOverview } from "./ops.controller";

const router = Router();

router.get("/overview", requireRole([UserRole.admin]), fetchOpsOverview);

export const opsRoutes = router;
