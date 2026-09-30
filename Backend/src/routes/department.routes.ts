import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";

import { checkAuthorizationForSuperRoles, checkEligibilty } from "../middlewares/RBAC.middleware.js";
import { addDepartment, deleteDepartment, getAllDepartments, updateDepartment } from "../controllers/department.controller.js";

const router = Router()

router.use(requireAuth,checkEligibilty,checkAuthorizationForSuperRoles)

router.route("/:tenantId/add").post(addDepartment)
router.route("/:tenantId/all").get(getAllDepartments)
router.route("/:tenantId/update").patch(updateDepartment)
router.route("/:tenantId/delete").delete(deleteDepartment)
export default router