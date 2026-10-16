import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { checkEligibilty, requirePermissions } from "../middlewares/RBAC.middleware.js";
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
router.route("/options").get(requirePermissions("appointments:read"), getAppointmentOptions);
router.route("/").get(requirePermissions("appointments:read"), getAppointments).post(requirePermissions("appointments:write"), createAppointment);
router.route("/get-stats").get(requirePermissions("appointments:read"), getAppointmentStats)
router.route("/:appointmentId").get(requirePermissions("appointments:read"), getAppointmentById).patch(requirePermissions("appointments:write"), updateAppointment);
export default router;