import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  createBillingPortalSession,
  createCheckoutSession,
  getSubscription,
} from "../controllers/subscription.controller.js";

const router = Router();
router.use(requireAuth);
router.get("/current", getSubscription);
router.post("/checkout", createCheckoutSession);
router.post("/portal", createBillingPortalSession);

export default router;
