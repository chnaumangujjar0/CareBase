import { Router } from "express";
import { checkEligibilty, requirePermissions } from "../middlewares/RBAC.middleware.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  createPatient,
  createPatientMedicalData,
  deletePatient,
  getPatientById,
  getPatients,
  updatePatient,
} from "../controllers/patient.controller.js";

const router = Router();

router.use(requireAuth, checkEligibilty);
router.route("/").get(requirePermissions("patients:read"), getPatients).post(requirePermissions("patients:write"), createPatient);
router.route("/:patientId/medical-data").post(requirePermissions("patients:write"), createPatientMedicalData);
router.route("/:patientId").get(requirePermissions("patients:read"), getPatientById).patch(requirePermissions("patients:write"), updatePatient).delete(requirePermissions("patients:write"), deletePatient);

export default router;