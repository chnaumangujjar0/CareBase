import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { checkEligibilty, requirePermissions } from "../middlewares/RBAC.middleware.js";
import {
  createPharmacy,
  createPharmacyStockTransaction,
  createStockRequest,
  createSale,
  assignPharmacist,
  getPharmacyDashboard,
  listPharmacies,
  listPharmacists,
  listPharmacyStock,
  listPharmacyStockTransactions,
  listStockRequests,
  updatePharmacy,
  updateStockRequestStatus,
} from "../controllers/pharmacy.controller.js";

const router = Router();

router.use(requireAuth, checkEligibilty);

router.route("/")
  .get(requirePermissions("clinical:medicines:read"), listPharmacies)
  .post(requirePermissions("clinical:medicines:write"), createPharmacy);
router.get("/pharmacists", requirePermissions("clinical:medicines:read"), listPharmacists);
router.patch("/:pharmacyId", requirePermissions("clinical:medicines:write"), updatePharmacy);
router.patch("/:pharmacyId/pharmacist", requirePermissions("clinical:medicines:write"), assignPharmacist);
router.get("/:pharmacyId/stock", requirePermissions("clinical:medicines:read"), listPharmacyStock);
router.get("/:pharmacyId/stock-transactions", requirePermissions("clinical:medicines:read"), listPharmacyStockTransactions);
router.post("/:pharmacyId/stock-transactions", requirePermissions("clinical:medicines:write"), createPharmacyStockTransaction);
router.post("/:pharmacyId/sales", requirePermissions("clinical:medicines:write"), createSale);

router.get("/dashboard", requirePermissions("clinical:medicines:read"), getPharmacyDashboard);

router.route("/requests")
  .get(requirePermissions("clinical:medicines:read"), listStockRequests)
  .post(requirePermissions("clinical:medicines:write"), createStockRequest);
router.patch("/requests/:requestId/status", requirePermissions("clinical:medicines:write"), updateStockRequestStatus);

export default router;