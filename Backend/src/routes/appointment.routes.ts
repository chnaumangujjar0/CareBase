import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { checkEligibilty } from "../middlewares/RBAC.middleware.js";
import {
  createAppointment,
  getAppointmentById,
  getAppointmentOptions,
  getAppointments,
  getAppointmentStats,
  updateAppointment,
} from "../controllers/appointment.controller.js";

const router = Router();

router.use(requireAuth, checkEligibilty);
router.route("/options").get(getAppointmentOptions);
router.route("/").get(getAppointments).post(createAppointment);
router.route("/get-stats").get(getAppointmentStats)
router.route("/:appointmentId").get(getAppointmentById).patch(updateAppointment);
export default router;