import { Router } from "express";
import { completeOnboarding, getTenantById } from "../controllers/tenant.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { upload } from "../middlewares/multer.middleware";

const router = Router()

router.route("/onboarding").post(
    requireAuth,
    upload.fields([
        { name: "logo", maxCount: 1 },
        { name: "favicon", maxCount: 1 },
    ]),
    completeOnboarding,
)
router.route("/:tenantId").get(requireAuth,getTenantById)
export default router