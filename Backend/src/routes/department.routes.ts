import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";

import { checkEligibilty } from "../middlewares/RBAC.middleware";
import { addDepartment } from "../controllers/department.controller";

const router = Router()

router.route("/add-department").post(requireAuth,checkEligibilty,addDepartment)

export default router