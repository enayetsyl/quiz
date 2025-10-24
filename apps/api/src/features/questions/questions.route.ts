import { Router } from "express";

import { UserRole } from "@prisma/client";

import { requireAuth, requireRole } from "@/features/auth/auth.middleware";
import { internalApprovedQuestionsHandler } from "@/features/exports/exports.controller";
import { requireInternalBearer } from "@/middlewares/internalBearerAuth";

import {
  bulkDeleteQuestionsHandler,
  bulkPublishQuestionsHandler,
  bulkUpdateStatusHandler,
  listQuestionsHandler,
  updateQuestionHandler,
} from "./questions.controller";

const router = Router();

router.get("/approved", requireInternalBearer, internalApprovedQuestionsHandler);
router.get("/", requireAuth, listQuestionsHandler);

const editorRoles = [UserRole.admin, UserRole.approver];

router.patch("/:questionId", requireRole(editorRoles), updateQuestionHandler);
router.post("/bulk/status", requireRole(editorRoles), bulkUpdateStatusHandler);
router.post("/bulk/delete", requireRole(editorRoles), bulkDeleteQuestionsHandler);
router.post("/bulk/publish", requireRole(editorRoles), bulkPublishQuestionsHandler);

export const questionsRoutes = router;

