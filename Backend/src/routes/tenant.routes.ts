import { Router } from "express";
import { completeOnboarding, getTenantById } from "../controllers/tenant.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { upload } from "../middlewares/multer.middleware";
import { checkEligibilty } from "../middlewares/RBAC.middleware";

const router = Router()

router.route("/onboarding").post(
    requireAuth,
    upload.fields([
        { name: "logo", maxCount: 1 },
        { name: "favicon", maxCount: 1 },
    ]),
    completeOnboarding,
)
router.route("/:tenantId").get(requireAuth,checkEligibilty,getTenantById)
export default router