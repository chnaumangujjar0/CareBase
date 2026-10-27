-- Development hardening step 3: prevent destructive clinical cascades and
-- reject unknown workflow states. This preserves rows and makes deletes fail
-- explicitly when dependent clinical data exists.

ALTER TABLE "PatientMedicalData"
  DROP CONSTRAINT IF EXISTS "patientMedicalData_patient_tenant_fkey";
ALTER TABLE "PatientMedicalData"
  ADD CONSTRAINT "patientMedicalData_patient_tenant_fkey"
  FOREIGN KEY ("patientId", "tenantId") REFERENCES "Patient"("id", "tenantId")
  ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "auditLog_userId_fkey";
ALTER TABLE "Ward" DROP CONSTRAINT IF EXISTS "ward_tenantId_fkey";
ALTER TABLE "Room" DROP CONSTRAINT IF EXISTS "room_tenantId_fkey";
ALTER TABLE "Bed" DROP CONSTRAINT IF EXISTS "bed_tenantId_fkey";
ALTER TABLE "Ward" ADD CONSTRAINT "ward_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "Room" ADD CONSTRAINT "room_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "Bed" ADD CONSTRAINT "bed_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "Appointment"
  ADD CONSTRAINT "appointment_status_check"
  CHECK ("status" IN ('booked', 'completed', 'cancelled', 'no_show')) NOT VALID;
ALTER TABLE "Bed"
  ADD CONSTRAINT "bed_status_check"
  CHECK ("status" IN ('available', 'occupied', 'maintenance')) NOT VALID;
ALTER TABLE "Encounter"
  ADD CONSTRAINT "encounter_status_check"
  CHECK ("status" IN ('waiting', 'in_progress', 'closed')) NOT VALID;
ALTER TABLE "Admission"
  ADD CONSTRAINT "admission_status_check"
  CHECK ("status" IN ('admitted', 'discharged')) NOT VALID;
ALTER TABLE "SurgeryCase"
  ADD CONSTRAINT "surgeryCase_status_check"
  CHECK ("status" IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'postponed')) NOT VALID;
ALTER TABLE "Prescription"
  ADD CONSTRAINT "prescription_status_check"
  CHECK ("status" IN ('active', 'cancelled')) NOT VALID;
ALTER TABLE "StockRequest"
  ADD CONSTRAINT "stockRequest_status_check"
  CHECK ("status" IN ('pending', 'approved', 'rejected', 'dispatched', 'received', 'partially_received', 'not_received')) NOT VALID;
ALTER TABLE "BillingInvoice"
  ADD CONSTRAINT "billingInvoice_status_check"
  CHECK ("status" IN ('draft', 'open', 'partially_paid', 'paid', 'void', 'overdue')) NOT VALID;
ALTER TABLE "BillingPayment"
  ADD CONSTRAINT "billingPayment_status_check"
  CHECK ("status" IN ('completed', 'void', 'refunded')) NOT VALID;

ALTER TABLE "BillingInvoice"
  ADD CONSTRAINT "billingInvoice_total_check"
  CHECK ("totalAmount" = "subtotal" + "taxAmount" - "discountAmount") NOT VALID;
ALTER TABLE "BillingInvoice"
  ADD CONSTRAINT "billingInvoice_balance_check"
  CHECK ("balanceAmount" = "totalAmount" - "paidAmount") NOT VALID;
ALTER TABLE "Bed"
  ADD CONSTRAINT "bed_occupancy_check"
  CHECK (("status" = 'occupied') = ("currentPatientId" IS NOT NULL)) NOT VALID;
