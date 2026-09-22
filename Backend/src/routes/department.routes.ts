import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";

import { checkAuthorizationForSuperRoles, checkEligibilty } from "../middlewares/RBAC.middleware";
import { addDepartment, getAllDepartments } from "../controllers/department.controller";

const router = Router()

router.route("/:tenantId/add").post(requireAuth,checkEligibilty,checkAuthorizationForSuperRoles,addDepartment)
router.route("/:tenantId/all").get(getAllDepartments)
export default router