import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { checkAuthorizationForSuperRoles, checkEligibilty, requirePermissions } from "../middlewares/RBAC.middleware.js";
import {
  createMedicine,
  createMedicineStockTransaction,
  listMedicineStockTransactions,
  listMedicines,
  updateMedicine,
} from "../controllers/medicine.controller.js";

const router = Router();

router.use(requireAuth, checkEligibilty);
router.get("/", requirePermissions("clinical:medicines:read"), listMedicines);
router.post("/", requirePermissions("clinical:medicines:write"), checkAuthorizationForSuperRoles, createMedicine);
router.patch("/:medicineId", requirePermissions("clinical:medicines:write"), checkAuthorizationForSuperRoles, updateMedicine);
router.get("/:medicineId/stock-transactions", requirePermissions("clinical:medicines:read"), listMedicineStockTransactions);
router.post("/:medicineId/stock-transactions", requirePermissions("clinical:medicines:write"), createMedicineStockTransaction);

export default router;
