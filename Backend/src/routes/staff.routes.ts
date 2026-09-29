import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";

import { checkAuthorizationForSuperRoles, checkEligibilty } from "../middlewares/RBAC.middleware";
import { addStaff } from "../controllers/staff.controller";

const router = Router()

router.use(requireAuth,checkEligibilty,checkAuthorizationForSuperRoles)

router.route("/add").post(addStaff)

export default router;