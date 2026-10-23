-- Fail with a clear message if historical rows violate the new tenant-scoped relations.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Appointment" a
    LEFT JOIN "Department" d ON d."id" = a."departmentId" AND d."tenantId" = a."tenantId"
    LEFT JOIN "DoctorProfile" dp ON dp."id" = a."doctorId" AND dp."tenantId" = a."tenantId"
    LEFT JOIN "Patient" p ON p."id" = a."patientId" AND p."tenantId" = a."tenantId"
    WHERE d."id" IS NULL OR dp."id" IS NULL OR p."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot add tenant-scoped appointment relations: existing appointments reference another tenant or missing records';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "DoctorProfile" dp
    LEFT JOIN "Department" d ON d."id" = dp."departmentId" AND d."tenantId" = dp."tenantId"
    WHERE d."id" IS NULL
  ) OR EXISTS (
    SELECT 1 FROM "StaffProfile" sp
    LEFT JOIN "Department" d ON d."id" = sp."departmentId" AND d."tenantId" = sp."tenantId"
    WHERE sp."departmentId" IS NOT NULL AND d."id" IS NULL
  ) OR EXISTS (
    SELECT 1 FROM "Ward" w
    LEFT JOIN "Department" d ON d."id" = w."departmentId" AND d."tenantId" = w."tenantId"
    WHERE w."departmentId" IS NOT NULL AND d."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot add tenant-scoped department relations: existing doctors, staff, or wards reference another tenant or missing departments';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "DoctorProfile"
    GROUP BY "tenantId", "employeeId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add tenant-scoped doctor employee IDs: duplicate employee IDs already exist within a hospital';
  END IF;
END $$;

-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "appointment_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "appointment_doctorId_fkey";

-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "appointment_patientId_fkey";

-- DropForeignKey
ALTER TABLE "DoctorProfile" DROP CONSTRAINT "doctorProfile_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "StaffProfile" DROP CONSTRAINT "staffProfile_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "Ward" DROP CONSTRAINT "ward_departmentId_fkey";

-- DropIndex
DROP INDEX "Appointment_doctorId_idx_04369053";

-- DropIndex
DROP INDEX "Appointment_tenantId_idx_c93ed4f1";

-- DropIndex
DROP INDEX "AuditLog_tenantId_idx_c93ed4f1";

-- DropIndex
DROP INDEX "Bed_roomId_idx_fe51d647";

-- DropIndex
DROP INDEX "Bed_tenantId_idx_c93ed4f1";

-- DropIndex
DROP INDEX "Department_tenantId_idx_c93ed4f1";

-- DropIndex
DROP INDEX "DoctorProfile_phone_key";

-- DropIndex
DROP INDEX "DoctorProfile_tenantId_idx_c93ed4f1";

-- DropIndex
DROP INDEX "Patient_tenantId_idx_c93ed4f1";

-- DropIndex
DROP INDEX "patientMedicalData_patient_recordedAt_idx";

-- DropIndex
DROP INDEX "Role_tenantId_idx_c93ed4f1";

-- DropIndex
DROP INDEX "Room_wardId_idx_6180a90a";

-- DropIndex
DROP INDEX "Session_revokedAt_idx_f1d8e6b3";

-- DropIndex
DROP INDEX "StaffProfile_tenantId_idx_c93ed4f1";

-- DropIndex
DROP INDEX "Ward_tenantId_idx_c93ed4f1";

-- DropIndex
DROP INDEX "StockTransaction_tenantId_idx";

-- DropIndex
DROP INDEX "BillingInvoiceItem_saleId_idx";

-- AlterTable
ALTER TABLE "Patient" ALTER COLUMN "dob" TYPE DATE USING ("dob" AT TIME ZONE 'UTC')::date;

-- CreateIndex
CREATE INDEX "Appointment_tenantId_status_scheduledAt_idx" ON "Appointment"("tenantId", "status", "scheduledAt");

-- CreateIndex
CREATE INDEX "Bed_tenantId_status_idx" ON "Bed"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorProfile_tenantId_phone_key" ON "DoctorProfile"("tenantId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorProfile_tenantId_employeeId_key" ON "DoctorProfile"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "StockTransaction_tenantId_createdAt_idx" ON "StockTransaction"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "StockTransaction_pharmacyId_createdAt_idx" ON "StockTransaction"("pharmacyId", "createdAt");

-- CreateIndex
CREATE INDEX "PharmacyStock_tenantId_medicineId_idx" ON "PharmacyStock"("tenantId", "medicineId");

-- CreateIndex
CREATE INDEX "StockRequest_requestingPharmacyId_status_createdAt_idx" ON "StockRequest"("requestingPharmacyId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "StockRequest_fulfillingPharmacyId_status_createdAt_idx" ON "StockRequest"("fulfillingPharmacyId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "appointment_departmentId_fkey" FOREIGN KEY ("departmentId", "tenantId") REFERENCES "Department"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "appointment_doctorId_fkey" FOREIGN KEY ("doctorId", "tenantId") REFERENCES "DoctorProfile"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "appointment_patientId_fkey" FOREIGN KEY ("patientId", "tenantId") REFERENCES "Patient"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DoctorProfile" ADD CONSTRAINT "doctorProfile_departmentId_fkey" FOREIGN KEY ("departmentId", "tenantId") REFERENCES "Department"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "StaffProfile" ADD CONSTRAINT "staffProfile_departmentId_fkey" FOREIGN KEY ("departmentId", "tenantId") REFERENCES "Department"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Ward" ADD CONSTRAINT "ward_departmentId_fkey" FOREIGN KEY ("departmentId", "tenantId") REFERENCES "Department"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;
