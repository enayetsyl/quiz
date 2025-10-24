import { Router } from "express";

import { requireAuth } from "@/features/auth/auth.middleware";

import { exportQuestionBankHandler, exportQuestionsHandler } from "./exports.controller";

const router = Router();

router.get("/questions", requireAuth, exportQuestionsHandler);
router.get("/question-bank", requireAuth, exportQuestionBankHandler);

export const exportsRoutes = router;
