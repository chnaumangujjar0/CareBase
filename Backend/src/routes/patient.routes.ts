import { Router } from "express";
import { checkEligibilty } from "../middlewares/RBAC.middleware.js";
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
router.route("/").get(getPatients).post(createPatient);
router.route("/:patientId/medical-data").post(createPatientMedicalData);
router.route("/:patientId").get(getPatientById).patch(updatePatient).delete(deletePatient);

export default router;