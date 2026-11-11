import { Router } from "express";
import { currentUser, forgotPassword, login, logout, refreshAccessToken, registerOwner, resetPassword } from "../controllers/user.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { loginRateLimit } from "../middlewares/loginRateLimit.middleware.js";
import { passwordResetRateLimit } from "../middlewares/passwordResetRateLimit.middleware.js";



const router = Router()

router.route("/register").post(registerOwner)
router.route("/login").post(loginRateLimit, login)
router.route("/forgot-password").post(passwordResetRateLimit, forgotPassword)
router.route("/reset-password").post(resetPassword)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/current-user").get(requireAuth,currentUser)
router.route("/logout").post(logout)

export default router;
