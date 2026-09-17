import { Router } from "express";
import { currentUser, login, logout, refreshAccessToken, registerOwner } from "../controllers/user.controller";
import { requireAuth } from "../middlewares/auth.middleware";



const router = Router()

router.route("/register").post(registerOwner)
router.route("/login").post(login)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/current-user").get(requireAuth,currentUser)
router.route("/logout").post(logout)

export default router;