import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  createBillingPortalSession,
  createCheckoutSession,
  confirmCheckoutSession,
  getSubscription,
} from "../controllers/subscription.controller.js";

const router = Router();
router.use(requireAuth);
router.get("/current", getSubscription);
router.post("/checkout", createCheckoutSession);
router.post("/checkout/confirm", confirmCheckoutSession);
router.post("/portal", createBillingPortalSession);

export default router;
