import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";

import { checkAuthorizationForSuperRoles, checkEligibilty, requirePermissions } from "../middlewares/RBAC.middleware.js";
import { addDepartment, deleteDepartment, getAllDepartments, updateDepartment } from "../controllers/department.controller.js";

const router = Router()

router.use(requireAuth, checkEligibilty)

router.route("/:tenantId/add").post(checkAuthorizationForSuperRoles, addDepartment)
router.route("/:tenantId/all").get(requirePermissions("departments:read"), getAllDepartments)
router.route("/:tenantId/update").patch(checkAuthorizationForSuperRoles, updateDepartment)
router.route("/:tenantId/delete").delete(checkAuthorizationForSuperRoles, deleteDepartment)
export default router
