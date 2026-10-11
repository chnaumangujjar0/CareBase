BEGIN;

-- DropForeignKey
ALTER TABLE "Bed" DROP CONSTRAINT "bed_currentPatientId_fkey";

-- AlterTable
ALTER TABLE "PatientMedicalData" ADD COLUMN     "encounterId" UUID;

-- CreateTable
CREATE TABLE "Encounter" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL DEFAULT 'outpatient',
    "source" TEXT NOT NULL DEFAULT 'appointment',
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "disposition" TEXT,
    "chiefComplaint" TEXT,
    "startedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMPTZ(6),
    "version" INTEGER NOT NULL DEFAULT 1,
    "queueDate" DATE,
    "queueNumber" INTEGER,
    "triageLevel" TEXT,
    "triagedAt" TIMESTAMPTZ(6),
    "triagedBy" UUID,
    "arrivalMode" TEXT,
    "tenantId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "departmentId" UUID NOT NULL,
    "doctorId" UUID,
    "appointmentId" UUID,

    CONSTRAINT "Encounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consultation" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" TEXT NOT NULL DEFAULT 'initial',
    "chiefComplaint" TEXT,
    "findings" TEXT,
    "diagnosis" TEXT,
    "notes" TEXT,
    "followUpDate" DATE,
    "tenantId" UUID NOT NULL,
    "encounterId" UUID NOT NULL,
    "doctorId" UUID NOT NULL,

    CONSTRAINT "Consultation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medicine" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "genericName" TEXT,
    "form" TEXT,
    "strength" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" UUID NOT NULL,

    CONSTRAINT "Medicine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prescription" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "tenantId" UUID NOT NULL,
    "encounterId" UUID NOT NULL,
    "doctorId" UUID NOT NULL,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescriptionItem" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dose" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "durationDays" INTEGER,
    "instructions" TEXT,
    "tenantId" UUID NOT NULL,
    "prescriptionId" UUID NOT NULL,
    "medicineId" UUID NOT NULL,

    CONSTRAINT "PrescriptionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admission" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'admitted',
    "reason" TEXT NOT NULL,
    "admissionDiagnosis" TEXT,
    "admittedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dischargedAt" TIMESTAMPTZ(6),
    "dischargeType" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tenantId" UUID NOT NULL,
    "encounterId" UUID NOT NULL,
    "admittingDoctorId" UUID NOT NULL,
    "departmentId" UUID NOT NULL,

    CONSTRAINT "Admission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BedAssignment" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMPTZ(6),
    "reason" TEXT,
    "tenantId" UUID NOT NULL,
    "bedId" UUID NOT NULL,
    "encounterId" UUID NOT NULL,
    "admissionId" UUID,
    "assignedBy" UUID,

    CONSTRAINT "BedAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatingTheatre" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" UUID NOT NULL,

    CONSTRAINT "OperatingTheatre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurgeryCase" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "procedureName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "scheduledAt" TIMESTAMPTZ(6) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "startedAt" TIMESTAMPTZ(6),
    "endedAt" TIMESTAMPTZ(6),
    "anesthesiaType" TEXT,
    "preOpNotes" TEXT,
    "outcomeNotes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tenantId" UUID NOT NULL,
    "encounterId" UUID NOT NULL,
    "admissionId" UUID,
    "theatreId" UUID NOT NULL,
    "surgeonId" UUID NOT NULL,

    CONSTRAINT "SurgeryCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurgeryTeamMember" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT NOT NULL,
    "tenantId" UUID NOT NULL,
    "surgeryId" UUID NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "SurgeryTeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DischargeSummary" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalDiagnosis" TEXT,
    "proceduresPerformed" TEXT,
    "courseInHospital" TEXT,
    "conditionAtDischarge" TEXT,
    "followUpInstructions" TEXT,
    "followUpDate" DATE,
    "tenantId" UUID NOT NULL,
    "admissionId" UUID NOT NULL,
    "doctorId" UUID NOT NULL,

    CONSTRAINT "DischargeSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Encounter_appointmentId_key" ON "Encounter"("appointmentId");

-- CreateIndex
CREATE INDEX "Encounter_tenantId_departmentId_status_startedAt_idx" ON "Encounter"("tenantId", "departmentId", "status", "startedAt");

-- CreateIndex
CREATE INDEX "Encounter_tenantId_patientId_startedAt_idx" ON "Encounter"("tenantId", "patientId", "startedAt");

-- CreateIndex
CREATE INDEX "Encounter_tenantId_status_triageLevel_startedAt_idx" ON "Encounter"("tenantId", "status", "triageLevel", "startedAt");

-- CreateIndex
CREATE INDEX "Encounter_doctorId_status_idx" ON "Encounter"("doctorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Encounter_id_tenantId_key" ON "Encounter"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Encounter_appointmentId_tenantId_key" ON "Encounter"("appointmentId", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Encounter_tenantId_departmentId_queueDate_queueNumber_key" ON "Encounter"("tenantId", "departmentId", "queueDate", "queueNumber");

-- CreateIndex
CREATE INDEX "Consultation_encounterId_createdAt_idx" ON "Consultation"("encounterId", "createdAt");

-- CreateIndex
CREATE INDEX "Consultation_doctorId_createdAt_idx" ON "Consultation"("doctorId", "createdAt");

-- CreateIndex
CREATE INDEX "Consultation_tenantId_idx" ON "Consultation"("tenantId");

-- CreateIndex
CREATE INDEX "Medicine_tenantId_name_idx" ON "Medicine"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Medicine_id_tenantId_key" ON "Medicine"("id", "tenantId");

-- CreateIndex
CREATE INDEX "Prescription_encounterId_idx" ON "Prescription"("encounterId");

-- CreateIndex
CREATE INDEX "Prescription_doctorId_createdAt_idx" ON "Prescription"("doctorId", "createdAt");

-- CreateIndex
CREATE INDEX "Prescription_tenantId_idx" ON "Prescription"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Prescription_id_tenantId_key" ON "Prescription"("id", "tenantId");

-- CreateIndex
CREATE INDEX "PrescriptionItem_prescriptionId_idx" ON "PrescriptionItem"("prescriptionId");

-- CreateIndex
CREATE INDEX "PrescriptionItem_medicineId_idx" ON "PrescriptionItem"("medicineId");

-- CreateIndex
CREATE INDEX "PrescriptionItem_tenantId_idx" ON "PrescriptionItem"("tenantId");

-- CreateIndex
CREATE INDEX "Admission_tenantId_status_admittedAt_idx" ON "Admission"("tenantId", "status", "admittedAt");

-- CreateIndex
CREATE INDEX "Admission_departmentId_idx" ON "Admission"("departmentId");

-- CreateIndex
CREATE INDEX "Admission_admittingDoctorId_idx" ON "Admission"("admittingDoctorId");

-- CreateIndex
CREATE UNIQUE INDEX "Admission_id_tenantId_key" ON "Admission"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Admission_encounterId_tenantId_key" ON "Admission"("encounterId", "tenantId");

-- CreateIndex
CREATE INDEX "BedAssignment_bedId_releasedAt_idx" ON "BedAssignment"("bedId", "releasedAt");

-- CreateIndex
CREATE INDEX "BedAssignment_encounterId_releasedAt_idx" ON "BedAssignment"("encounterId", "releasedAt");

-- CreateIndex
CREATE INDEX "BedAssignment_admissionId_idx" ON "BedAssignment"("admissionId");

-- CreateIndex
CREATE INDEX "BedAssignment_tenantId_idx" ON "BedAssignment"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "OperatingTheatre_tenantId_name_key" ON "OperatingTheatre"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "OperatingTheatre_id_tenantId_key" ON "OperatingTheatre"("id", "tenantId");

-- CreateIndex
CREATE INDEX "SurgeryCase_tenantId_scheduledAt_idx" ON "SurgeryCase"("tenantId", "scheduledAt");

-- CreateIndex
CREATE INDEX "SurgeryCase_theatreId_scheduledAt_idx" ON "SurgeryCase"("theatreId", "scheduledAt");

-- CreateIndex
CREATE INDEX "SurgeryCase_surgeonId_scheduledAt_idx" ON "SurgeryCase"("surgeonId", "scheduledAt");

-- CreateIndex
CREATE INDEX "SurgeryCase_encounterId_idx" ON "SurgeryCase"("encounterId");

-- CreateIndex
CREATE UNIQUE INDEX "SurgeryCase_id_tenantId_key" ON "SurgeryCase"("id", "tenantId");

-- CreateIndex
CREATE INDEX "SurgeryTeamMember_userId_idx" ON "SurgeryTeamMember"("userId");

-- CreateIndex
CREATE INDEX "SurgeryTeamMember_tenantId_idx" ON "SurgeryTeamMember"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "SurgeryTeamMember_surgeryId_userId_key" ON "SurgeryTeamMember"("surgeryId", "userId");

-- CreateIndex
CREATE INDEX "DischargeSummary_doctorId_idx" ON "DischargeSummary"("doctorId");

-- CreateIndex
CREATE INDEX "DischargeSummary_tenantId_idx" ON "DischargeSummary"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "DischargeSummary_admissionId_tenantId_key" ON "DischargeSummary"("admissionId", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_id_tenantId_key" ON "Appointment"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Bed_id_tenantId_key" ON "Bed"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_id_tenantId_key" ON "Department"("id", "tenantId");

-- CreateIndex
CREATE INDEX "PatientMedicalData_encounterId_tenantId_idx" ON "PatientMedicalData"("encounterId", "tenantId");

-- AddForeignKey
ALTER TABLE "Bed" ADD CONSTRAINT "bed_currentPatientId_fkey" FOREIGN KEY ("currentPatientId", "tenantId") REFERENCES "Patient"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PatientMedicalData" ADD CONSTRAINT "PatientMedicalData_encounterId_tenantId_fkey" FOREIGN KEY ("encounterId", "tenantId") REFERENCES "Encounter"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_patientId_tenantId_fkey" FOREIGN KEY ("patientId", "tenantId") REFERENCES "Patient"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_departmentId_tenantId_fkey" FOREIGN KEY ("departmentId", "tenantId") REFERENCES "Department"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_doctorId_tenantId_fkey" FOREIGN KEY ("doctorId", "tenantId") REFERENCES "DoctorProfile"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_appointmentId_tenantId_fkey" FOREIGN KEY ("appointmentId", "tenantId") REFERENCES "Appointment"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_triagedBy_fkey" FOREIGN KEY ("triagedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_encounterId_tenantId_fkey" FOREIGN KEY ("encounterId", "tenantId") REFERENCES "Encounter"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_doctorId_tenantId_fkey" FOREIGN KEY ("doctorId", "tenantId") REFERENCES "DoctorProfile"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Medicine" ADD CONSTRAINT "Medicine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_encounterId_tenantId_fkey" FOREIGN KEY ("encounterId", "tenantId") REFERENCES "Encounter"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_doctorId_tenantId_fkey" FOREIGN KEY ("doctorId", "tenantId") REFERENCES "DoctorProfile"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_prescriptionId_tenantId_fkey" FOREIGN KEY ("prescriptionId", "tenantId") REFERENCES "Prescription"("id", "tenantId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_medicineId_tenantId_fkey" FOREIGN KEY ("medicineId", "tenantId") REFERENCES "Medicine"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_encounterId_tenantId_fkey" FOREIGN KEY ("encounterId", "tenantId") REFERENCES "Encounter"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_admittingDoctorId_tenantId_fkey" FOREIGN KEY ("admittingDoctorId", "tenantId") REFERENCES "DoctorProfile"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_departmentId_tenantId_fkey" FOREIGN KEY ("departmentId", "tenantId") REFERENCES "Department"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "BedAssignment" ADD CONSTRAINT "BedAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "BedAssignment" ADD CONSTRAINT "BedAssignment_bedId_tenantId_fkey" FOREIGN KEY ("bedId", "tenantId") REFERENCES "Bed"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "BedAssignment" ADD CONSTRAINT "BedAssignment_encounterId_tenantId_fkey" FOREIGN KEY ("encounterId", "tenantId") REFERENCES "Encounter"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "BedAssignment" ADD CONSTRAINT "BedAssignment_admissionId_tenantId_fkey" FOREIGN KEY ("admissionId", "tenantId") REFERENCES "Admission"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "BedAssignment" ADD CONSTRAINT "BedAssignment_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OperatingTheatre" ADD CONSTRAINT "OperatingTheatre_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SurgeryCase" ADD CONSTRAINT "SurgeryCase_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SurgeryCase" ADD CONSTRAINT "SurgeryCase_encounterId_tenantId_fkey" FOREIGN KEY ("encounterId", "tenantId") REFERENCES "Encounter"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SurgeryCase" ADD CONSTRAINT "SurgeryCase_admissionId_tenantId_fkey" FOREIGN KEY ("admissionId", "tenantId") REFERENCES "Admission"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SurgeryCase" ADD CONSTRAINT "SurgeryCase_theatreId_tenantId_fkey" FOREIGN KEY ("theatreId", "tenantId") REFERENCES "OperatingTheatre"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SurgeryCase" ADD CONSTRAINT "SurgeryCase_surgeonId_tenantId_fkey" FOREIGN KEY ("surgeonId", "tenantId") REFERENCES "DoctorProfile"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SurgeryTeamMember" ADD CONSTRAINT "SurgeryTeamMember_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SurgeryTeamMember" ADD CONSTRAINT "SurgeryTeamMember_surgeryId_tenantId_fkey" FOREIGN KEY ("surgeryId", "tenantId") REFERENCES "SurgeryCase"("id", "tenantId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SurgeryTeamMember" ADD CONSTRAINT "SurgeryTeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DischargeSummary" ADD CONSTRAINT "DischargeSummary_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DischargeSummary" ADD CONSTRAINT "DischargeSummary_admissionId_tenantId_fkey" FOREIGN KEY ("admissionId", "tenantId") REFERENCES "Admission"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DischargeSummary" ADD CONSTRAINT "DischargeSummary_doctorId_tenantId_fkey" FOREIGN KEY ("doctorId", "tenantId") REFERENCES "DoctorProfile"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- Database invariants not expressible in the Prisma schema.
ALTER TABLE "Encounter"
  ADD CONSTRAINT "Encounter_type_check"
    CHECK ("type" IN ('outpatient', 'inpatient', 'emergency')),
  ADD CONSTRAINT "Encounter_source_check"
    CHECK ("source" IN ('appointment', 'walk_in', 'emergency', 'referral')),
  ADD CONSTRAINT "Encounter_status_check"
    CHECK ("status" IN ('waiting', 'in_progress', 'closed')),
  ADD CONSTRAINT "Encounter_disposition_check"
    CHECK ("disposition" IS NULL OR "disposition" IN
      ('discharged_home', 'admitted', 'transferred', 'referred_out', 'left_without_being_seen', 'deceased')),
  ADD CONSTRAINT "Encounter_triageLevel_check"
    CHECK ("triageLevel" IS NULL OR "triageLevel" IN ('critical', 'urgent', 'normal')),
  ADD CONSTRAINT "Encounter_arrivalMode_check"
    CHECK ("arrivalMode" IS NULL OR "arrivalMode" IN ('walk_in', 'ambulance', 'referral')),
  ADD CONSTRAINT "Encounter_endedAt_check"
    CHECK ("endedAt" IS NULL OR "endedAt" >= "startedAt"),
  ADD CONSTRAINT "Encounter_closed_time_check"
    CHECK (("status" = 'closed') = ("endedAt" IS NOT NULL)),
  ADD CONSTRAINT "Encounter_queue_check"
    CHECK (("queueDate" IS NULL) = ("queueNumber" IS NULL)
           AND ("queueNumber" IS NULL OR "queueNumber" > 0)),
  ADD CONSTRAINT "Encounter_version_check"
    CHECK ("version" > 0);

ALTER TABLE "Consultation"
  ADD CONSTRAINT "Consultation_kind_check"
    CHECK ("kind" IN ('initial', 'ward_round', 'pre_operative'));

ALTER TABLE "Prescription"
  ADD CONSTRAINT "Prescription_status_check"
    CHECK ("status" IN ('active', 'cancelled'));

ALTER TABLE "PrescriptionItem"
  ADD CONSTRAINT "PrescriptionItem_durationDays_check"
    CHECK ("durationDays" IS NULL OR "durationDays" > 0);

ALTER TABLE "Admission"
  ADD CONSTRAINT "Admission_status_check"
    CHECK ("status" IN ('admitted', 'discharged')),
  ADD CONSTRAINT "Admission_dischargeType_check"
    CHECK ("dischargeType" IS NULL OR "dischargeType" IN
      ('routine', 'against_medical_advice', 'transferred', 'deceased')),
  ADD CONSTRAINT "Admission_dischargedAt_check"
    CHECK ("dischargedAt" IS NULL OR "dischargedAt" >= "admittedAt"),
  ADD CONSTRAINT "Admission_discharged_time_check"
    CHECK (("status" = 'discharged') = ("dischargedAt" IS NOT NULL)),
  ADD CONSTRAINT "Admission_dischargeType_status_check"
    CHECK ("dischargeType" IS NULL OR "status" = 'discharged'),
  ADD CONSTRAINT "Admission_version_check"
    CHECK ("version" > 0);

ALTER TABLE "BedAssignment"
  ADD CONSTRAINT "BedAssignment_releasedAt_check"
    CHECK ("releasedAt" IS NULL OR "releasedAt" >= "assignedAt");

ALTER TABLE "SurgeryCase"
  ADD CONSTRAINT "SurgeryCase_status_check"
    CHECK ("status" IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'postponed')),
  ADD CONSTRAINT "SurgeryCase_anesthesiaType_check"
    CHECK ("anesthesiaType" IS NULL OR "anesthesiaType" IN ('general', 'regional', 'local', 'sedation')),
  ADD CONSTRAINT "SurgeryCase_duration_check"
    CHECK ("durationMinutes" > 0),
  ADD CONSTRAINT "SurgeryCase_endedAt_check"
    CHECK ("endedAt" IS NULL OR ("startedAt" IS NOT NULL AND "endedAt" >= "startedAt")),
  ADD CONSTRAINT "SurgeryCase_version_check"
    CHECK ("version" > 0);

ALTER TABLE "SurgeryTeamMember"
  ADD CONSTRAINT "SurgeryTeamMember_role_check"
    CHECK ("role" IN ('assistant_surgeon', 'anesthetist', 'scrub_nurse', 'circulating_nurse'));

-- Released assignments are retained as history; only open assignments count.
CREATE UNIQUE INDEX "BedAssignment_one_active_per_bed"
  ON "BedAssignment" ("bedId")
  WHERE "releasedAt" IS NULL;

CREATE UNIQUE INDEX "BedAssignment_one_active_per_encounter"
  ON "BedAssignment" ("encounterId")
  WHERE "releasedAt" IS NULL;

CREATE UNIQUE INDEX "Bed_one_active_per_patient"
  ON "Bed" ("currentPatientId")
  WHERE "currentPatientId" IS NOT NULL;

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE OR REPLACE FUNCTION carebase_add_minutes(ts timestamptz, mins integer)
RETURNS timestamptz
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
SET search_path = pg_catalog
AS $$ SELECT ts + mins * interval '1 minute' $$;

ALTER TABLE "SurgeryCase"
  ADD CONSTRAINT "SurgeryCase_no_theatre_overlap"
  EXCLUDE USING gist (
    "tenantId" WITH =,
    "theatreId" WITH =,
    tstzrange("scheduledAt", carebase_add_minutes("scheduledAt", "durationMinutes"), '[)') WITH &&
  )
  WHERE ("status" IN ('scheduled', 'in_progress'));

ALTER TABLE "SurgeryCase"
  ADD CONSTRAINT "SurgeryCase_no_surgeon_overlap"
  EXCLUDE USING gist (
    "tenantId" WITH =,
    "surgeonId" WITH =,
    tstzrange("scheduledAt", carebase_add_minutes("scheduledAt", "durationMinutes"), '[)') WITH &&
  )
  WHERE ("status" IN ('scheduled', 'in_progress'));

-- The API checks these conflicts for useful error messages; exclusions
-- provide the final guard when concurrent requests pass the same check.
ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_status_check"
    CHECK ("status" IN ('booked', 'completed', 'cancelled', 'no_show')),
  ADD CONSTRAINT "Appointment_duration_check"
    CHECK ("durationMinutes" BETWEEN 5 AND 480);

ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_no_doctor_overlap"
  EXCLUDE USING gist (
    "tenantId" WITH =,
    "doctorId" WITH =,
    tstzrange("scheduledAt", carebase_add_minutes("scheduledAt", "durationMinutes"), '[)') WITH &&
  )
  WHERE ("status" = 'booked');

ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_no_patient_overlap"
  EXCLUDE USING gist (
    "tenantId" WITH =,
    "patientId" WITH =,
    tstzrange("scheduledAt", carebase_add_minutes("scheduledAt", "durationMinutes"), '[)') WITH &&
  )
  WHERE ("status" = 'booked');

COMMIT;
