import { Router } from "express";
import { getDashboardMonthlyRevenue, getDashboardMonthlySales, getDashboardSummary } from "../controllers/dashboard.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { checkEligibilty, requirePermissions } from "../middlewares/RBAC.middleware.js";

const router = Router();

router.get("/summary", requireAuth, checkEligibilty, requirePermissions("dashboard:read"), getDashboardSummary);
router.get("/monthly-sales", requireAuth, checkEligibilty, requirePermissions("dashboard:read"), getDashboardMonthlySales);
router.get("/monthly-revenue", requireAuth, checkEligibilty, requirePermissions("dashboard:read"), getDashboardMonthlyRevenue);

export default router;
