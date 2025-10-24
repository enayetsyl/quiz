import { Router } from "express";

import { login, logout, me, requestPasswordReset, resetPassword } from "./auth.controller";
import { requireAuth } from "./auth.middleware";

const router = Router();

router.post("/login", login);
router.post("/logout", logout);
router.get("/me", requireAuth, me);
router.post("/password/request", requestPasswordReset);
router.post("/password/reset", resetPassword);

export const authRoutes = router;
