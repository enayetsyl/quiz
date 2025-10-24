import { Router } from "express";

import { UserRole } from "@prisma/client";

import { requireRole } from "@/features/auth/auth.middleware";

import {
  createChapterHandler,
  createClassLevelHandler,
  createSubjectHandler,
  deleteChapterHandler,
  deleteClassLevelHandler,
  deleteSubjectHandler,
  getTaxonomyTree,
  updateChapterHandler,
  updateClassLevelHandler,
  updateSubjectHandler
} from "./taxonomy.controller";

const router = Router();

router.use(requireRole([UserRole.admin]));

router.get("/", getTaxonomyTree);
router.post("/class-levels", createClassLevelHandler);
router.patch("/class-levels/:classLevelId", updateClassLevelHandler);
router.delete("/class-levels/:classLevelId", deleteClassLevelHandler);
router.post("/subjects", createSubjectHandler);
router.patch("/subjects/:subjectId", updateSubjectHandler);
router.delete("/subjects/:subjectId", deleteSubjectHandler);
router.post("/chapters", createChapterHandler);
router.patch("/chapters/:chapterId", updateChapterHandler);
router.delete("/chapters/:chapterId", deleteChapterHandler);

export const taxonomyRoutes = router;
