import { Router } from "express";
import { getDashboardSummary } from "../controllers/dashboard.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { checkEligibilty } from "../middlewares/RBAC.middleware.js";

const router = Router();

router.get("/summary", requireAuth, checkEligibilty, getDashboardSummary);

export default router;
