import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { checkAuthorizationForSuperRoles, checkEligibilty } from "../middlewares/RBAC.middleware.js";
import { createRole, deleteRole, getRoleCatalog, getRoles, updateRole } from "../controllers/role.controller.js";

const router = Router();

router.use(requireAuth, checkEligibilty, checkAuthorizationForSuperRoles);

router.route("/create").post(createRole);
router.route("/catalog").get(getRoleCatalog);
router.route("/get-roles").get(getRoles);
router.route("/:roleId").patch(updateRole).delete(deleteRole);

export default router;
