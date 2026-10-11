import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  checkAuthorizationForSuperRoles,
  checkEligibilty,
  requirePermissions,
} from "../middlewares/RBAC.middleware.js";
import {
  assignAdmissionBed,
  assignEncounterBed,
  createAdmission,
  createConsultation,
  createEncounter,
  createMedicine,
  createPrescription,
  createSurgeryCase,
  createTheatre,
  dischargeAdmission,
  getEncounter,
  listEncounters,
  listMedicines,
  listTheatres,
  releaseEncounterBed,
  transferAdmissionBed,
  transferEncounterBed,
  updateSurgeryCase,
  updateEncounter,
} from "../controllers/clinical.controller.js";

const router = Router();

router.use(requireAuth, checkEligibilty);

router.route("/encounters")
  .get(requirePermissions("clinical:encounters:read"), listEncounters)
  .post(requirePermissions("clinical:encounters:write"), createEncounter);
router.route("/encounters/:encounterId")
  .get(requirePermissions("clinical:encounters:read"), getEncounter)
  .patch(requirePermissions("clinical:encounters:write"), updateEncounter);
router.route("/encounters/:encounterId/consultations")
  .post(requirePermissions("clinical:consultations:write"), createConsultation);
router.route("/encounters/:encounterId/prescriptions")
  .post(requirePermissions("clinical:prescriptions:write"), createPrescription);
router.route("/encounters/:encounterId/admissions")
  .post(requirePermissions("clinical:admissions:write"), createAdmission);
router.route("/encounters/:encounterId/surgeries")
  .post(requirePermissions("clinical:surgeries:write"), createSurgeryCase);
router.route("/encounters/:encounterId/bed-assignments")
  .post(requirePermissions("clinical:beds:write"), assignEncounterBed);
router.route("/encounters/:encounterId/bed-release")
  .post(requirePermissions("clinical:beds:write"), releaseEncounterBed);
router.route("/encounters/:encounterId/bed-transfers")
  .post(requirePermissions("clinical:beds:write"), transferEncounterBed);

router.route("/medicines")
  .get(requirePermissions("clinical:medicines:read"), listMedicines)
  .post(requirePermissions("clinical:medicines:write"), checkAuthorizationForSuperRoles, createMedicine);
router.route("/theatres")
  .get(requirePermissions("clinical:surgeries:read"), listTheatres)
  .post(requirePermissions("clinical:surgeries:write"), checkAuthorizationForSuperRoles, createTheatre);

router.route("/admissions/:admissionId/bed-assignments")
  .post(requirePermissions("clinical:beds:write"), assignAdmissionBed);
router.route("/admissions/:admissionId/bed-transfers")
  .post(requirePermissions("clinical:beds:write"), transferAdmissionBed);
router.route("/admissions/:admissionId/discharge")
  .post(requirePermissions("clinical:admissions:discharge"), dischargeAdmission);
router.route("/surgeries/:surgeryId")
  .patch(requirePermissions("clinical:surgeries:write"), updateSurgeryCase);

export default router;
