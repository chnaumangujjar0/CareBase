import { Router } from "express";
import { listAuditLogs } from "../controllers/audit.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  checkAuthorizationForSuperRoles,
  checkEligibilty,
} from "../middlewares/RBAC.middleware.js";

const router = Router();

router.use(requireAuth, checkEligibilty, checkAuthorizationForSuperRoles);
router.get("/", listAuditLogs);

export default router;
