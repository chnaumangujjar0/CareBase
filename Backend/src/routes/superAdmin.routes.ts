import { Router } from "express";
import { listPlatformTenants, updatePlatformTenantApproval } from "../controllers/superAdmin.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requirePlatformSuperAdmin } from "../middlewares/RBAC.middleware.js";

const router = Router();
router.use(requireAuth, requirePlatformSuperAdmin);
router.get("/tenants", listPlatformTenants);
router.patch("/tenants/:tenantId/approval", updatePlatformTenantApproval);

export default router;
