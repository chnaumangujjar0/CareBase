import { Router } from "express";
import {
    completeOnboarding,
    getTenantById,
    updateTenantDetails,
} from "../controllers/tenant.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { checkEligibilty } from "../middlewares/RBAC.middleware.js";

const router = Router()

router.route("/onboarding").post(
    requireAuth,
    upload.fields([
        { name: "logo", maxCount: 1 },
        { name: "favicon", maxCount: 1 },
    ]),
    completeOnboarding,
)
router.route("/").patch(
    requireAuth,
    upload.fields([
        { name: "logo", maxCount: 1 },
        { name: "favicon", maxCount: 1 },
    ]),
    updateTenantDetails,
)
router.route("/:tenantId").get(requireAuth,checkEligibilty,getTenantById)
export default router