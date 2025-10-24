import { Router } from "express";

import { UserRole } from "@prisma/client";

import { requireRole } from "@/features/auth/auth.middleware";

import { createNewUser, getUsers, updateExistingUser } from "./users.controller";

const router = Router();

router.use(requireRole([UserRole.admin]));
router.get("/", getUsers);
router.post("/", createNewUser);
router.patch("/:userId", updateExistingUser);

export const usersRoutes = router;
