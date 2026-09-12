import { Router } from "express";
import { login, registerOwner } from "../controllers/user.controller";
import { completeOnboarding } from "../controllers/tenant.controller";


const router = Router()

router.route("/register").post(registerOwner)
router.route("/login").post(login)



export default router;