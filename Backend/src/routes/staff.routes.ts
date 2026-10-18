import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";

import { checkAuthorizationForSuperRoles, checkEligibilty, requirePermissions } from "../middlewares/RBAC.middleware.js";
import { addStaff, getAllStaff, getGrantableStaffRoles, getHrDashboard, grantStaffSystemAccess, updateAvailability, updateStaffProfile } from "../controllers/staff.controller.js";

const router = Router()

router.use(requireAuth, checkEligibilty)

router.get("/hr-dashboard", requirePermissions("hr:dashboard:read"), getHrDashboard)
router.get("/get-staff", requirePermissions("staff:read"), getAllStaff)
router.get("/account-roles", requirePermissions("staff:accounts:write"), getGrantableStaffRoles)
router.post("/add", requirePermissions("staff:write"), addStaff)
router.patch("/availability", checkAuthorizationForSuperRoles, updateAvailability)
router.patch("/:profileId", requirePermissions("staff:write"), updateStaffProfile)
router.post("/:profileId/account", requirePermissions("staff:accounts:write"), grantStaffSystemAccess)
export default router;
