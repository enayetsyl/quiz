import { Router } from "express";

import { validateRequest } from "@/middlewares/validateRequest";

import { healthCheck } from "./health.controller";
import { healthCheckSchema } from "./health.validation";

const router = Router();

router.get("/", validateRequest(healthCheckSchema), healthCheck);

export const healthRoutes = router;

