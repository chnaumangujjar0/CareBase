-- Development hardening step 2: make remaining tenant-owned references
-- database-enforced. This migration aborts before changing constraints if
-- historical rows contain cross-tenant references.

CREATE UNIQUE INDEX IF NOT EXISTS "ward_id_tenantId_key" ON "Ward" ("id", "tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "room_id_tenantId_key" ON "Room" ("id", "tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "role_id_tenantId_key" ON "Role" ("id", "tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "user_id_tenantId_key" ON "User" ("id", "tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "doctorProfile_userId_tenantId_key" ON "DoctorProfile" ("userId", "tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "staffProfile_userId_tenantId_key" ON "StaffProfile" ("userId", "tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "pharmacy_pharmacistUserId_tenantId_key" ON "Pharmacy" ("pharmacistUserId", "tenantId");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Room" r
    LEFT JOIN "Ward" w ON w."id" = r."wardId" AND w."tenantId" = r."tenantId"
    WHERE w."id" IS NULL
  ) OR EXISTS (
    SELECT 1 FROM "Bed" b
    LEFT JOIN "Room" r ON r."id" = b."roomId" AND r."tenantId" = b."tenantId"
    WHERE r."id" IS NULL
  ) OR EXISTS (
    SELECT 1 FROM "StaffProfile" s
    LEFT JOIN "Ward" w ON w."id" = s."wardId" AND w."tenantId" = s."tenantId"
    WHERE s."wardId" IS NOT NULL AND w."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot add tenant-scoped facility relations: room, bed, or staff ward data is inconsistent';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "User" u
    LEFT JOIN "Role" r ON r."id" = u."roleId" AND r."tenantId" = u."tenantId"
    WHERE u."roleId" IS NOT NULL AND (u."tenantId" IS NULL OR r."id" IS NULL)
  ) THEN
    RAISE EXCEPTION 'Cannot add tenant-scoped user role relation: user role data is inconsistent';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "DoctorProfile" p
    LEFT JOIN "User" u ON u."id" = p."userId" AND u."tenantId" = p."tenantId"
    WHERE u."id" IS NULL
  ) OR EXISTS (
    SELECT 1 FROM "StaffProfile" p
    LEFT JOIN "User" u ON u."id" = p."userId" AND u."tenantId" = p."tenantId"
    WHERE p."userId" IS NOT NULL AND u."id" IS NULL
  ) OR EXISTS (
    SELECT 1 FROM "Pharmacy" p
    LEFT JOIN "User" u ON u."id" = p."pharmacistUserId" AND u."tenantId" = p."tenantId"
    WHERE p."pharmacistUserId" IS NOT NULL AND u."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot add tenant-scoped user profile relation: profile or pharmacist data is inconsistent';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "Appointment" a
    LEFT JOIN "User" u ON u."id" = a."createdBy" AND u."tenantId" = a."tenantId"
    WHERE a."createdBy" IS NOT NULL AND u."id" IS NULL
  ) OR EXISTS (
    SELECT 1 FROM "Appointment" a
    LEFT JOIN "User" u ON u."id" = a."updatedBy" AND u."tenantId" = a."tenantId"
    WHERE a."updatedBy" IS NOT NULL AND u."id" IS NULL
  ) OR EXISTS (
    SELECT 1 FROM "PatientMedicalData" p
    LEFT JOIN "User" u ON u."id" = p."recordedBy" AND u."tenantId" = p."tenantId"
    WHERE p."recordedBy" IS NOT NULL AND u."id" IS NULL
  ) OR EXISTS (
    SELECT 1 FROM "Encounter" e
    LEFT JOIN "User" u ON u."id" = e."triagedBy" AND u."tenantId" = e."tenantId"
    WHERE e."triagedBy" IS NOT NULL AND u."id" IS NULL
  ) OR EXISTS (
    SELECT 1 FROM "StockTransaction" s
    LEFT JOIN "User" u ON u."id" = s."recordedBy" AND u."tenantId" = s."tenantId"
    WHERE s."recordedBy" IS NOT NULL AND u."id" IS NULL
  ) OR EXISTS (
    SELECT 1 FROM "BedAssignment" b
    LEFT JOIN "User" u ON u."id" = b."assignedBy" AND u."tenantId" = b."tenantId"
    WHERE b."assignedBy" IS NOT NULL AND u."id" IS NULL
  ) OR EXISTS (
    SELECT 1 FROM "StockRequest" s
    LEFT JOIN "User" u ON u."id" = s."requestedBy" AND u."tenantId" = s."tenantId"
    WHERE u."id" IS NULL
  ) OR EXISTS (
    SELECT 1 FROM "StockRequest" s
    LEFT JOIN "User" u ON u."id" = s."handledBy" AND u."tenantId" = s."tenantId"
    WHERE s."handledBy" IS NOT NULL AND u."id" IS NULL
  ) OR EXISTS (
    SELECT 1 FROM "StockRequest" s
    LEFT JOIN "User" u ON u."id" = s."receivedBy" AND u."tenantId" = s."tenantId"
    WHERE s."receivedBy" IS NOT NULL AND u."id" IS NULL
  ) OR EXISTS (
    SELECT 1 FROM "Sale" s
    LEFT JOIN "User" u ON u."id" = s."soldBy" AND u."tenantId" = s."tenantId"
    WHERE u."id" IS NULL
  ) OR EXISTS (
    SELECT 1 FROM "BillingInvoice" i
    LEFT JOIN "User" u ON u."id" = i."createdBy" AND u."tenantId" = i."tenantId"
    WHERE u."id" IS NULL
  ) OR EXISTS (
    SELECT 1 FROM "BillingPayment" p
    LEFT JOIN "User" u ON u."id" = p."collectedBy" AND u."tenantId" = p."tenantId"
    WHERE u."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot add tenant-scoped actor relations: existing actor data is inconsistent';
  END IF;
END $$;

ALTER TABLE "Room" DROP CONSTRAINT IF EXISTS "room_wardId_fkey";
ALTER TABLE "Bed" DROP CONSTRAINT IF EXISTS "bed_roomId_fkey";
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "user_roleId_fkey";
ALTER TABLE "DoctorProfile" DROP CONSTRAINT IF EXISTS "doctorProfile_userId_fkey";
ALTER TABLE "StaffProfile" DROP CONSTRAINT IF EXISTS "staffProfile_userId_fkey";
ALTER TABLE "StaffProfile" DROP CONSTRAINT IF EXISTS "staffProfile_wardId_fkey";
ALTER TABLE "Pharmacy" DROP CONSTRAINT IF EXISTS "Pharmacy_pharmacistUserId_fkey";
ALTER TABLE "Appointment" DROP CONSTRAINT IF EXISTS "appointment_createdBy_fkey";
ALTER TABLE "Appointment" DROP CONSTRAINT IF EXISTS "appointment_updatedBy_fkey";
ALTER TABLE "PatientMedicalData" DROP CONSTRAINT IF EXISTS "patientMedicalData_recordedBy_fkey";
ALTER TABLE "Encounter" DROP CONSTRAINT IF EXISTS "Encounter_triagedBy_fkey";
ALTER TABLE "StockTransaction" DROP CONSTRAINT IF EXISTS "StockTransaction_recordedBy_fkey";
ALTER TABLE "BedAssignment" DROP CONSTRAINT IF EXISTS "BedAssignment_assignedBy_fkey";
ALTER TABLE "StockRequest" DROP CONSTRAINT IF EXISTS "StockRequest_requestedBy_fkey";
ALTER TABLE "StockRequest" DROP CONSTRAINT IF EXISTS "StockRequest_handledBy_fkey";
ALTER TABLE "StockRequest" DROP CONSTRAINT IF EXISTS "StockRequest_receivedBy_fkey";
ALTER TABLE "Sale" DROP CONSTRAINT IF EXISTS "Sale_soldBy_fkey";
ALTER TABLE "BillingInvoice" DROP CONSTRAINT IF EXISTS "BillingInvoice_createdBy_fkey";
ALTER TABLE "BillingPayment" DROP CONSTRAINT IF EXISTS "BillingPayment_collectedBy_fkey";

ALTER TABLE "Room" ADD CONSTRAINT "room_wardId_fkey"
  FOREIGN KEY ("wardId", "tenantId") REFERENCES "Ward"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "Bed" ADD CONSTRAINT "bed_roomId_fkey"
  FOREIGN KEY ("roomId", "tenantId") REFERENCES "Room"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "User" ADD CONSTRAINT "user_roleId_fkey"
  FOREIGN KEY ("roleId", "tenantId") REFERENCES "Role"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "DoctorProfile" ADD CONSTRAINT "doctorProfile_userId_fkey"
  FOREIGN KEY ("userId", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "StaffProfile" ADD CONSTRAINT "staffProfile_userId_fkey"
  FOREIGN KEY ("userId", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "StaffProfile" ADD CONSTRAINT "staffProfile_wardId_fkey"
  FOREIGN KEY ("wardId", "tenantId") REFERENCES "Ward"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "Pharmacy" ADD CONSTRAINT "Pharmacy_pharmacistUserId_fkey"
  FOREIGN KEY ("pharmacistUserId", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "Appointment" ADD CONSTRAINT "appointment_createdBy_fkey"
  FOREIGN KEY ("createdBy", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "Appointment" ADD CONSTRAINT "appointment_updatedBy_fkey"
  FOREIGN KEY ("updatedBy", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "PatientMedicalData" ADD CONSTRAINT "patientMedicalData_recordedBy_fkey"
  FOREIGN KEY ("recordedBy", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_triagedBy_fkey"
  FOREIGN KEY ("triagedBy", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_recordedBy_fkey"
  FOREIGN KEY ("recordedBy", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "BedAssignment" ADD CONSTRAINT "BedAssignment_assignedBy_fkey"
  FOREIGN KEY ("assignedBy", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "StockRequest" ADD CONSTRAINT "StockRequest_requestedBy_fkey"
  FOREIGN KEY ("requestedBy", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "StockRequest" ADD CONSTRAINT "StockRequest_handledBy_fkey"
  FOREIGN KEY ("handledBy", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "StockRequest" ADD CONSTRAINT "StockRequest_receivedBy_fkey"
  FOREIGN KEY ("receivedBy", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_soldBy_fkey"
  FOREIGN KEY ("soldBy", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "BillingInvoice" ADD CONSTRAINT "BillingInvoice_createdBy_fkey"
  FOREIGN KEY ("createdBy", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "BillingPayment" ADD CONSTRAINT "BillingPayment_collectedBy_fkey"
  FOREIGN KEY ("collectedBy", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;
