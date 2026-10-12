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
  cancelPrescription,
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
  listAdmissions,
  listSurgeryCases,
  listAvailableBeds,
  listMedicines,
  listTheatres,
  listSurgeryTeamOptions,
  releaseEncounterBed,
  transferAdmissionBed,
  transferEncounterBed,
  updateSurgeryCase,
  updateEncounter,
  updateMedicine,
  updateTheatre,
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
router.route("/prescriptions/:prescriptionId/cancel")
  .post(requirePermissions("clinical:prescriptions:write"), cancelPrescription);
router.route("/encounters/:encounterId/admissions")
  .post(requirePermissions("clinical:admissions:write"), createAdmission);
router.route("/admissions")
  .get(requirePermissions("clinical:admissions:read"), listAdmissions);
router.route("/encounters/:encounterId/surgeries")
  .post(requirePermissions("clinical:surgeries:write"), createSurgeryCase);
router.route("/encounters/:encounterId/bed-assignments")
  .post(requirePermissions("clinical:beds:write"), assignEncounterBed);
router.route("/encounters/:encounterId/bed-release")
  .post(requirePermissions("clinical:beds:write"), releaseEncounterBed);
router.route("/encounters/:encounterId/bed-transfers")
  .post(requirePermissions("clinical:beds:write"), transferEncounterBed);
router.route("/beds")
  .get(requirePermissions("clinical:beds:write"), listAvailableBeds);

router.route("/medicines")
  .get(requirePermissions("clinical:medicines:read"), listMedicines)
  .post(requirePermissions("clinical:medicines:write"), checkAuthorizationForSuperRoles, createMedicine);
router.route("/medicines/:medicineId")
  .patch(requirePermissions("clinical:medicines:write"), checkAuthorizationForSuperRoles, updateMedicine);
router.route("/theatres")
  .get(requirePermissions("clinical:surgeries:read"), listTheatres)
  .post(requirePermissions("clinical:surgeries:write"), checkAuthorizationForSuperRoles, createTheatre);
router.route("/surgery-team-options")
  .get(requirePermissions("clinical:surgeries:read"), listSurgeryTeamOptions);
router.route("/theatres/:theatreId")
  .patch(requirePermissions("clinical:surgeries:write"), checkAuthorizationForSuperRoles, updateTheatre);
router.route("/surgeries")
  .get(requirePermissions("clinical:surgeries:read"), listSurgeryCases);

router.route("/admissions/:admissionId/bed-assignments")
  .post(requirePermissions("clinical:beds:write"), assignAdmissionBed);
router.route("/admissions/:admissionId/bed-transfers")
  .post(requirePermissions("clinical:beds:write"), transferAdmissionBed);
router.route("/admissions/:admissionId/discharge")
  .post(requirePermissions("clinical:admissions:discharge"), dischargeAdmission);
router.route("/surgeries/:surgeryId")
  .patch(requirePermissions("clinical:surgeries:write"), updateSurgeryCase);

export default router;
