import { Router } from "express";
import {
  createPublicAppointment,
  getPublicAppointment,
  getPublicDoctorSlots,
  getPublicDoctors,
  publicBookingRateLimit,
  publicDirectoryRateLimit,
  publicLookupRateLimit,
} from "../controllers/publicAppointment.controller.js";

const router = Router();

router.get("/doctors", publicDirectoryRateLimit, getPublicDoctors);
router.get("/doctors/:doctorId/slots", publicDirectoryRateLimit, getPublicDoctorSlots);
router.post("/appointments", publicBookingRateLimit, createPublicAppointment);
router.post("/appointments/lookup", publicLookupRateLimit, getPublicAppointment);

export default router;
