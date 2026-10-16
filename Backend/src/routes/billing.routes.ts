import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { checkEligibilty, requirePermissions } from "../middlewares/RBAC.middleware.js";
import {
  addInvoiceItem,
  collectPayment,
  createAppointmentInvoice,
  createInpatientInvoice,
  createRate,
  getInvoice,
  listInvoices,
  listBillableAppointments,
  listBillableAdmissions,
  listRates,
  updateRate,
} from "../controllers/billing.controller.js";

const router = Router();

router.use(requireAuth, checkEligibilty);

router.route("/rates")
  .get(requirePermissions("billing:rates:read"), listRates)
  .post(requirePermissions("billing:rates:write"), createRate);
router.patch("/rates/:rateId", requirePermissions("billing:rates:write"), updateRate);

router.get("/invoices", requirePermissions("billing:invoices:read"), listInvoices);
router.get("/candidates/appointments", requirePermissions("billing:invoices:read"), listBillableAppointments);
router.get("/candidates/admissions", requirePermissions("billing:invoices:read"), listBillableAdmissions);
router.get("/invoices/:invoiceId", requirePermissions("billing:invoices:read"), getInvoice);
router.post("/invoices/appointment", requirePermissions("billing:invoices:write"), createAppointmentInvoice);
router.post("/invoices/inpatient", requirePermissions("billing:invoices:write"), createInpatientInvoice);
router.post("/invoices/:invoiceId/items", requirePermissions("billing:invoices:write"), addInvoiceItem);
router.post("/invoices/:invoiceId/payments", requirePermissions("billing:payments:write"), collectPayment);

export default router;