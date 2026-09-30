import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";

import { checkAuthorizationForSuperRoles, checkEligibilty } from "../middlewares/RBAC.middleware.js";
import { addStaff } from "../controllers/staff.controller.js";

const router = Router()

router.use(requireAuth,checkEligibilty,checkAuthorizationForSuperRoles)

router.route("/add").post(addStaff)

export default router;