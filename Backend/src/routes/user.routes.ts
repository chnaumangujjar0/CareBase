import { Router } from "express";
import { login, registerOwner } from "../controllers/user.controller";
import { completeOnboarding } from "../controllers/tenant.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { upload } from "../middlewares/multer.middleware";

const router = Router()

router.route("/register").post(registerOwner)
router.route("/login").post(login)
router.route("/onboarding").post(
	requireAuth,
	upload.fields([
		{ name: "logo", maxCount: 1 },
		{ name: "favicon", maxCount: 1 },
	]),
	completeOnboarding,
)


export default router;