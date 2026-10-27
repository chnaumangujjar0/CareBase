-- Development hardening step 1: add non-destructive lifecycle/scheduling fields,
-- database validation, and indexes. Existing invalid rows intentionally abort this
-- migration instead of being silently rewritten.

ALTER TABLE "Ward" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Bed" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "endsAt" TIMESTAMPTZ(6);
UPDATE "Appointment"
SET "endsAt" = "scheduledAt" + make_interval(mins => "durationMinutes")
WHERE "endsAt" IS NULL;
ALTER TABLE "Appointment" ALTER COLUMN "endsAt" SET NOT NULL;

ALTER TABLE "SurgeryCase" ADD COLUMN IF NOT EXISTS "endsAt" TIMESTAMPTZ(6);
UPDATE "SurgeryCase"
SET "endsAt" = COALESCE("startedAt", "scheduledAt") + make_interval(mins => "durationMinutes")
WHERE "endsAt" IS NULL;
ALTER TABLE "SurgeryCase" ALTER COLUMN "endsAt" SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Appointment"
    WHERE "endsAt" <= "scheduledAt" OR "durationMinutes" <= 0
  ) THEN
    RAISE EXCEPTION 'Appointment scheduling data contains non-positive durations or endsAt <= scheduledAt';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "SurgeryCase"
    WHERE "endsAt" <= "scheduledAt" OR "durationMinutes" <= 0
  ) THEN
    RAISE EXCEPTION 'Surgery scheduling data contains non-positive durations or endsAt <= scheduledAt';
  END IF;
END $$;

ALTER TABLE "DoctorAvailability"
  ADD CONSTRAINT "doctorAvailability_dayOfWeek_check"
  CHECK ("dayOfWeek" BETWEEN 0 AND 6) NOT VALID;
ALTER TABLE "DoctorAvailability"
  ADD CONSTRAINT "doctorAvailability_timeRange_check"
  CHECK ("startMinute" < "endMinute" AND "endMinute" <= 1440) NOT VALID;
ALTER TABLE "StaffAvailability"
  ADD CONSTRAINT "staffAvailability_dayOfWeek_check"
  CHECK ("dayOfWeek" BETWEEN 0 AND 6) NOT VALID;
ALTER TABLE "StaffAvailability"
  ADD CONSTRAINT "staffAvailability_timeRange_check"
  CHECK ("startMinute" < "endMinute" AND "endMinute" <= 1440) NOT VALID;

ALTER TABLE "StockTransaction"
  ADD CONSTRAINT "stockTransaction_quantity_check"
  CHECK ("quantity" > 0) NOT VALID;
ALTER TABLE "PharmacyStock"
  ADD CONSTRAINT "pharmacyStock_currentStock_check"
  CHECK ("currentStock" >= 0 AND "reorderLevel" >= 0) NOT VALID;
ALTER TABLE "StockRequestItem"
  ADD CONSTRAINT "stockRequestItem_quantity_check"
  CHECK ("requestedQuantity" > 0 AND COALESCE("approvedQuantity", 0) >= 0 AND COALESCE("receivedQuantity", 0) >= 0) NOT VALID;
ALTER TABLE "SaleItem"
  ADD CONSTRAINT "saleItem_quantity_check"
  CHECK ("quantity" > 0) NOT VALID;
ALTER TABLE "BillingInvoiceItem"
  ADD CONSTRAINT "billingInvoiceItem_quantity_check"
  CHECK ("quantity" > 0) NOT VALID;

ALTER TABLE "BillingRate"
  ADD CONSTRAINT "billingRate_money_check"
  CHECK ("amount" >= 0 AND "taxRate" >= 0) NOT VALID;
ALTER TABLE "BillingInvoice"
  ADD CONSTRAINT "billingInvoice_money_check"
  CHECK ("subtotal" >= 0 AND "taxAmount" >= 0 AND "discountAmount" >= 0 AND "totalAmount" >= 0 AND "paidAmount" >= 0 AND "balanceAmount" >= 0) NOT VALID;
ALTER TABLE "BillingPayment"
  ADD CONSTRAINT "billingPayment_amount_check"
  CHECK ("amount" >= 0) NOT VALID;
ALTER TABLE "Medicine"
  ADD CONSTRAINT "medicine_money_check"
  CHECK ("purchasePrice" >= 0 AND "sellingPrice" >= 0) NOT VALID;
ALTER TABLE "Sale"
  ADD CONSTRAINT "sale_money_check"
  CHECK ("totalAmount" >= 0) NOT VALID;
ALTER TABLE "SaleItem"
  ADD CONSTRAINT "saleItem_money_check"
  CHECK ("unitPurchasePrice" >= 0 AND "unitSellingPrice" >= 0 AND "lineTotal" >= 0) NOT VALID;

ALTER TABLE "Encounter"
  ADD CONSTRAINT "encounter_timeRange_check"
  CHECK ("endedAt" IS NULL OR "endedAt" >= "startedAt") NOT VALID;
ALTER TABLE "Admission"
  ADD CONSTRAINT "admission_timeRange_check"
  CHECK ("dischargedAt" IS NULL OR "dischargedAt" >= "admittedAt") NOT VALID;
ALTER TABLE "SurgeryCase"
  ADD CONSTRAINT "surgeryCase_timeRange_check"
  CHECK ("endedAt" >= "startedAt" OR "startedAt" IS NULL) NOT VALID;
ALTER TABLE "StockRequest"
  ADD CONSTRAINT "stockRequest_pharmacies_differ_check"
  CHECK ("requestingPharmacyId" <> "fulfillingPharmacyId") NOT VALID;

CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Appointment_tenant_patient_scheduledAt_idx"
  ON "Appointment" ("tenantId", "patientId", "scheduledAt");
CREATE INDEX IF NOT EXISTS "AuditLog_tenant_entity_createdAt_idx"
  ON "AuditLog" ("tenantId", "entityType", "entityId", "createdAt");
CREATE INDEX IF NOT EXISTS "Patient_name_trgm_idx"
  ON "Patient" USING GIN (("firstName" || ' ' || "lastName") gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Patient_phone_trgm_idx"
  ON "Patient" USING GIN ("contactPhone" gin_trgm_ops);

CREATE UNIQUE INDEX IF NOT EXISTS "BedAssignment_active_bed_key"
  ON "BedAssignment" ("bedId")
  WHERE "releasedAt" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "BedAssignment_active_encounter_key"
  ON "BedAssignment" ("encounterId")
  WHERE "releasedAt" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "BillingPayment_tenant_method_reference_key"
  ON "BillingPayment" ("tenantId", "method", "reference")
  WHERE "reference" IS NOT NULL AND btrim("reference") <> '';

CREATE TABLE IF NOT EXISTS "TenantCounter" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "kind" TEXT NOT NULL,
  "nextValue" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenantCounter_nextValue_check" CHECK ("nextValue" > 0),
  CONSTRAINT "TenantCounter_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "TenantCounter_tenant_kind_key" UNIQUE ("tenantId", "kind")
);
CREATE INDEX IF NOT EXISTS "TenantCounter_tenantId_idx" ON "TenantCounter" ("tenantId");

CREATE OR REPLACE FUNCTION "carebase_block_tenant_change"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD."tenantId" IS DISTINCT FROM NEW."tenantId" THEN
    RAISE EXCEPTION 'tenantId is immutable for %.%', TG_TABLE_SCHEMA, TG_TABLE_NAME
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'Appointment', 'AuditLog', 'Bed', 'BillingInvoice', 'BillingInvoiceItem',
    'BillingPayment', 'BillingRate', 'Consultation', 'Department',
    'DischargeSummary', 'DoctorAvailability', 'DoctorProfile', 'Encounter',
    'Medicine', 'Patient', 'PatientMedicalData', 'Pharmacy', 'PharmacyStock',
    'Prescription', 'PrescriptionItem', 'Role', 'Room', 'Sale', 'SaleItem',
    'StaffAvailability', 'StaffProfile', 'StockRequest', 'StockRequestItem',
    'StockTransaction', 'SurgeryCase', 'SurgeryTeamMember', 'Ward', 'User'
  ]
  LOOP
    IF to_regclass(format('%I', table_name)) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', lower(table_name || '_tenant_immutable'), table_name);
      EXECUTE format(
        'CREATE TRIGGER %I BEFORE UPDATE OF "tenantId" ON %I FOR EACH ROW EXECUTE FUNCTION "carebase_block_tenant_change"()',
        lower(table_name || '_tenant_immutable'), table_name
      );
    END IF;
  END LOOP;
END $$;
