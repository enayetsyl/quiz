import { Router } from "express";

import { UserRole } from "@prisma/client";

import { requireRole } from "@/features/auth/auth.middleware";
import { upload } from "@/utils/multer";

import {
  createUploadHandler,
  getUploadHandler,
  listUploadsHandler,
} from "./uploads.controller";

const router = Router();

router.use(requireRole([UserRole.admin, UserRole.approver]));

router.post("/", upload.single("file"), createUploadHandler);
router.get("/:uploadId", getUploadHandler);
router.get("/", listUploadsHandler);

export const uploadRoutes = router;

