import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";

import { checkAuthorizationForSuperRoles, checkEligibilty } from "../middlewares/RBAC.middleware";
import { addDepartment, deleteDepartment, getAllDepartments, updateDepartment } from "../controllers/department.controller";

const router = Router()

router.route("/:tenantId/add").post(requireAuth,checkEligibilty,checkAuthorizationForSuperRoles,addDepartment)
router.route("/:tenantId/all").get(requireAuth,checkEligibilty,checkAuthorizationForSuperRoles,getAllDepartments)
router.route("/:tenantId/update").patch(requireAuth,checkEligibilty,checkAuthorizationForSuperRoles,updateDepartment)
router.route("/:tenantId/delete").delete(requireAuth,checkEligibilty,checkAuthorizationForSuperRoles,deleteDepartment)
export default router