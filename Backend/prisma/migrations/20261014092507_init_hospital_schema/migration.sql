-- CreateTable
CREATE TABLE "Appointment" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledAt" TIMESTAMPTZ(6) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "status" TEXT NOT NULL DEFAULT 'booked',
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tenantId" UUID NOT NULL,
    "departmentId" UUID NOT NULL,
    "doctorId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" UUID,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "tenantId" UUID,
    "userId" UUID,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bed" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "version" INTEGER NOT NULL DEFAULT 1,
    "roomId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "currentPatientId" UUID,

    CONSTRAINT "Bed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" UUID NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorProfile" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "employeeId" TEXT NOT NULL,
    "designation" TEXT,
    "specialization" TEXT NOT NULL,
    "qualifications" TEXT,
    "licenseNumber" TEXT,
    "description" TEXT,
    "phone" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "departmentId" UUID NOT NULL,

    CONSTRAINT "DoctorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorAvailability" (
    "id" UUID NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "doctorId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,

    CONSTRAINT "DoctorAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ(6),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mrn" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dob" TIMESTAMPTZ(6) NOT NULL,
    "gender" TEXT,
    "address" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "insuranceProvider" TEXT,
    "insurancePolicyNumber" TEXT,
    "type" TEXT NOT NULL DEFAULT 'Unknown',
    "tenantId" UUID NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientMedicalData" (
    "id" UUID NOT NULL,
    "recordedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "heartRate" INTEGER,
    "totalCholesterol" INTEGER,
    "hemoglobin" DOUBLE PRECISION,
    "systolicBloodPressure" INTEGER,
    "diastolicBloodPressure" INTEGER,
    "bloodGlucose" INTEGER,
    "whiteBloodCellCount" INTEGER,
    "bodyMassIndex" DOUBLE PRECISION,
    "respiratoryRate" INTEGER,
    "plateletCount" INTEGER,
    "allergies" TEXT,
    "chronicConditions" TEXT,
    "pastSurgeries" TEXT,
    "note" TEXT,
    "patientId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "encounterId" UUID,
    "recordedBy" UUID,

    CONSTRAINT "PatientMedicalData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "tenantId" UUID NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "wardId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "revokedAt" TIMESTAMPTZ(6),
    "tokenHash" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" UUID NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffProfile" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "employeeId" TEXT NOT NULL,
    "designation" TEXT,
    "description" TEXT,
    "phone" TEXT,
    "joiningDate" TIMESTAMPTZ(6),
    "userId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "departmentId" UUID,
    "wardId" UUID,

    CONSTRAINT "StaffProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffAvailability" (
    "id" UUID NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "staffId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,

    CONSTRAINT "StaffAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'PK',
    "postalCode" TEXT,
    "favicon" TEXT NOT NULL,
    "logo" TEXT NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "authProvider" TEXT DEFAULT 'local',
    "roleId" UUID,
    "tenantId" UUID,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ward" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "tenantId" UUID NOT NULL,
    "departmentId" UUID,

    CONSTRAINT "Ward_pkey" PRIMARY KEY ("id")
);

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
    "medicineName" TEXT NOT NULL,
    "tenantId" UUID NOT NULL,
    "prescriptionId" UUID NOT NULL,
    "medicineId" UUID,

    CONSTRAINT "PrescriptionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTransaction" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "pharmacyId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "medicineId" UUID NOT NULL,
    "recordedBy" UUID,

    CONSTRAINT "StockTransaction_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "Pharmacy" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'sub_store',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" UUID NOT NULL,

    CONSTRAINT "Pharmacy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PharmacyStock" (
    "id" UUID NOT NULL,
    "currentStock" INTEGER NOT NULL DEFAULT 0,
    "reorderLevel" INTEGER NOT NULL DEFAULT 10,
    "pharmacyId" UUID NOT NULL,
    "medicineId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,

    CONSTRAINT "PharmacyStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockRequest" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "dispatchedAt" TIMESTAMPTZ(6),
    "receivedAt" TIMESTAMPTZ(6),
    "tenantId" UUID NOT NULL,
    "requestingPharmacyId" UUID NOT NULL,
    "fulfillingPharmacyId" UUID NOT NULL,
    "requestedBy" UUID NOT NULL,
    "handledBy" UUID,
    "receivedBy" UUID,

    CONSTRAINT "StockRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockRequestItem" (
    "id" UUID NOT NULL,
    "requestedQuantity" INTEGER NOT NULL,
    "approvedQuantity" INTEGER,
    "tenantId" UUID NOT NULL,
    "stockRequestId" UUID NOT NULL,
    "medicineId" UUID NOT NULL,

    CONSTRAINT "StockRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Appointment_createdBy_idx_ba0f792f" ON "Appointment"("createdBy");

-- CreateIndex
CREATE INDEX "Appointment_departmentId_idx_8e261ed8" ON "Appointment"("departmentId");

-- CreateIndex
CREATE INDEX "Appointment_doctorId_idx_04369053" ON "Appointment"("doctorId");

-- CreateIndex
CREATE INDEX "Appointment_patientId_idx_e5f07e88" ON "Appointment"("patientId");

-- CreateIndex
CREATE INDEX "Appointment_tenantId_idx_c93ed4f1" ON "Appointment"("tenantId");

-- CreateIndex
CREATE INDEX "Appointment_tenantId_scheduledAt_idx_31e2839e" ON "Appointment"("tenantId", "scheduledAt");

-- CreateIndex
CREATE INDEX "Appointment_updatedBy_idx_0780dcde" ON "Appointment"("updatedBy");

-- CreateIndex
CREATE INDEX "appointment_doctor_schedule_idx_23b246b0" ON "Appointment"("doctorId", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_id_tenantId_key" ON "Appointment"("id", "tenantId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx_ea0fa809" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_createdAt_idx_88162366" ON "AuditLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_idx_c93ed4f1" ON "AuditLog"("tenantId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx_a489d58a" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "Bed_currentPatientId_idx_41689716" ON "Bed"("currentPatientId");

-- CreateIndex
CREATE INDEX "Bed_roomId_idx_fe51d647" ON "Bed"("roomId");

-- CreateIndex
CREATE INDEX "Bed_tenantId_idx_c93ed4f1" ON "Bed"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "bed_room_code_key_aff24a4e" ON "Bed"("roomId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Bed_id_tenantId_key" ON "Bed"("id", "tenantId");

-- CreateIndex
CREATE INDEX "Department_tenantId_idx_c93ed4f1" ON "Department"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "department_tenant_name_key_efdfefee" ON "Department"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Department_id_tenantId_key" ON "Department"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorProfile_phone_key" ON "DoctorProfile"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorProfile_userId_key" ON "DoctorProfile"("userId");

-- CreateIndex
CREATE INDEX "DoctorProfile_departmentId_idx_8e261ed8" ON "DoctorProfile"("departmentId");

-- CreateIndex
CREATE INDEX "DoctorProfile_tenantId_idx_c93ed4f1" ON "DoctorProfile"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "doctorProfile_id_tenantId_key" ON "DoctorProfile"("id", "tenantId");

-- CreateIndex
CREATE INDEX "doctorAvailability_schedule_idx" ON "DoctorAvailability"("tenantId", "doctorId", "dayOfWeek", "isActive");

-- CreateIndex
CREATE INDEX "doctorAvailability_doctorId_idx" ON "DoctorAvailability"("doctorId");

-- CreateIndex
CREATE INDEX "Patient_tenantId_idx_c93ed4f1" ON "Patient"("tenantId");

-- CreateIndex
CREATE INDEX "Patient_tenantId_lastName_idx_8d5f431c" ON "Patient"("tenantId", "lastName");

-- CreateIndex
CREATE UNIQUE INDEX "patient_tenant_mrn_key_0c21d836" ON "Patient"("tenantId", "mrn");

-- CreateIndex
CREATE UNIQUE INDEX "patient_id_tenantId_key" ON "Patient"("id", "tenantId");

-- CreateIndex
CREATE INDEX "patientMedicalData_tenant_patient_recordedAt_idx" ON "PatientMedicalData"("tenantId", "patientId", "recordedAt");

-- CreateIndex
CREATE INDEX "patientMedicalData_patient_recordedAt_idx" ON "PatientMedicalData"("patientId", "recordedAt");

-- CreateIndex
CREATE INDEX "patientMedicalData_recordedBy_idx" ON "PatientMedicalData"("recordedBy");

-- CreateIndex
CREATE INDEX "PatientMedicalData_encounterId_tenantId_idx" ON "PatientMedicalData"("encounterId", "tenantId");

-- CreateIndex
CREATE INDEX "Role_tenantId_idx_c93ed4f1" ON "Role"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "role_tenant_name_key_efdfefee" ON "Role"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Room_tenantId_idx_c93ed4f1" ON "Room"("tenantId");

-- CreateIndex
CREATE INDEX "Room_wardId_idx_6180a90a" ON "Room"("wardId");

-- CreateIndex
CREATE UNIQUE INDEX "Room_wardId_name_key" ON "Room"("wardId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx_6b6b8c10" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Session_revokedAt_idx_f1d8e6b3" ON "Session"("revokedAt");

-- CreateIndex
CREATE INDEX "Session_userId_idx_a489d58a" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffProfile_userId_key" ON "StaffProfile"("userId");

-- CreateIndex
CREATE INDEX "StaffProfile_departmentId_idx_8e261ed8" ON "StaffProfile"("departmentId");

-- CreateIndex
CREATE INDEX "StaffProfile_tenantId_idx_c93ed4f1" ON "StaffProfile"("tenantId");

-- CreateIndex
CREATE INDEX "StaffProfile_wardId_idx_6180a90a" ON "StaffProfile"("wardId");

-- CreateIndex
CREATE UNIQUE INDEX "staffProfile_tenant_employeeId_key_c90418e2" ON "StaffProfile"("tenantId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "staffProfile_id_tenantId_key" ON "StaffProfile"("id", "tenantId");

-- CreateIndex
CREATE INDEX "staffAvailability_schedule_idx" ON "StaffAvailability"("tenantId", "staffId", "dayOfWeek", "isActive");

-- CreateIndex
CREATE INDEX "staffAvailability_staffId_idx" ON "StaffAvailability"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_roleId_idx_ffccc9a4" ON "User"("roleId");

-- CreateIndex
CREATE INDEX "User_tenantId_idx_c93ed4f1" ON "User"("tenantId");

-- CreateIndex
CREATE INDEX "Ward_departmentId_idx_8e261ed8" ON "Ward"("departmentId");

-- CreateIndex
CREATE INDEX "Ward_tenantId_idx_c93ed4f1" ON "Ward"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Ward_tenantId_name_key" ON "Ward"("tenantId", "name");

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
CREATE INDEX "StockTransaction_medicineId_createdAt_idx" ON "StockTransaction"("medicineId", "createdAt");

-- CreateIndex
CREATE INDEX "StockTransaction_tenantId_idx" ON "StockTransaction"("tenantId");

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
CREATE UNIQUE INDEX "Pharmacy_tenantId_name_key" ON "Pharmacy"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Pharmacy_id_tenantId_key" ON "Pharmacy"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "PharmacyStock_pharmacyId_medicineId_tenantId_key" ON "PharmacyStock"("pharmacyId", "medicineId", "tenantId");

-- CreateIndex
CREATE INDEX "StockRequest_tenantId_status_createdAt_idx" ON "StockRequest"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StockRequest_id_tenantId_key" ON "StockRequest"("id", "tenantId");

-- CreateIndex
CREATE INDEX "StockRequestItem_stockRequestId_idx" ON "StockRequestItem"("stockRequestId");

-- CreateIndex
CREATE INDEX "StockRequestItem_medicineId_idx" ON "StockRequestItem"("medicineId");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "appointment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "appointment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "appointment_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "appointment_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "auditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "auditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Bed" ADD CONSTRAINT "bed_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Bed" ADD CONSTRAINT "bed_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Bed" ADD CONSTRAINT "bed_currentPatientId_fkey" FOREIGN KEY ("currentPatientId", "tenantId") REFERENCES "Patient"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "department_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DoctorProfile" ADD CONSTRAINT "doctorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DoctorProfile" ADD CONSTRAINT "doctorProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DoctorProfile" ADD CONSTRAINT "doctorProfile_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DoctorAvailability" ADD CONSTRAINT "doctorAvailability_doctorId_fkey" FOREIGN KEY ("doctorId", "tenantId") REFERENCES "DoctorProfile"("id", "tenantId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DoctorAvailability" ADD CONSTRAINT "doctorAvailability_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "patient_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PatientMedicalData" ADD CONSTRAINT "patientMedicalData_patient_tenant_fkey" FOREIGN KEY ("patientId", "tenantId") REFERENCES "Patient"("id", "tenantId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PatientMedicalData" ADD CONSTRAINT "patientMedicalData_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PatientMedicalData" ADD CONSTRAINT "patientMedicalData_recordedBy_fkey" FOREIGN KEY ("recordedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PatientMedicalData" ADD CONSTRAINT "PatientMedicalData_encounterId_tenantId_fkey" FOREIGN KEY ("encounterId", "tenantId") REFERENCES "Encounter"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "role_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "room_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "room_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "StaffProfile" ADD CONSTRAINT "staffProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "StaffProfile" ADD CONSTRAINT "staffProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "StaffProfile" ADD CONSTRAINT "staffProfile_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "StaffProfile" ADD CONSTRAINT "staffProfile_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "StaffAvailability" ADD CONSTRAINT "staffAvailability_staffId_fkey" FOREIGN KEY ("staffId", "tenantId") REFERENCES "StaffProfile"("id", "tenantId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "StaffAvailability" ADD CONSTRAINT "staffAvailability_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "user_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "user_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Ward" ADD CONSTRAINT "ward_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Ward" ADD CONSTRAINT "ward_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

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
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_pharmacyId_tenantId_fkey" FOREIGN KEY ("pharmacyId", "tenantId") REFERENCES "Pharmacy"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_medicineId_tenantId_fkey" FOREIGN KEY ("medicineId", "tenantId") REFERENCES "Medicine"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_recordedBy_fkey" FOREIGN KEY ("recordedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

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

-- AddForeignKey
ALTER TABLE "Pharmacy" ADD CONSTRAINT "Pharmacy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PharmacyStock" ADD CONSTRAINT "PharmacyStock_pharmacyId_tenantId_fkey" FOREIGN KEY ("pharmacyId", "tenantId") REFERENCES "Pharmacy"("id", "tenantId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PharmacyStock" ADD CONSTRAINT "PharmacyStock_medicineId_tenantId_fkey" FOREIGN KEY ("medicineId", "tenantId") REFERENCES "Medicine"("id", "tenantId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PharmacyStock" ADD CONSTRAINT "PharmacyStock_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "StockRequest" ADD CONSTRAINT "StockRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "StockRequest" ADD CONSTRAINT "StockRequest_requestingPharmacyId_tenantId_fkey" FOREIGN KEY ("requestingPharmacyId", "tenantId") REFERENCES "Pharmacy"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "StockRequest" ADD CONSTRAINT "StockRequest_fulfillingPharmacyId_tenantId_fkey" FOREIGN KEY ("fulfillingPharmacyId", "tenantId") REFERENCES "Pharmacy"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "StockRequest" ADD CONSTRAINT "StockRequest_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "StockRequest" ADD CONSTRAINT "StockRequest_handledBy_fkey" FOREIGN KEY ("handledBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "StockRequest" ADD CONSTRAINT "StockRequest_receivedBy_fkey" FOREIGN KEY ("receivedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "StockRequestItem" ADD CONSTRAINT "StockRequestItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "StockRequestItem" ADD CONSTRAINT "StockRequestItem_stockRequestId_tenantId_fkey" FOREIGN KEY ("stockRequestId", "tenantId") REFERENCES "StockRequest"("id", "tenantId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "StockRequestItem" ADD CONSTRAINT "StockRequestItem_medicineId_tenantId_fkey" FOREIGN KEY ("medicineId", "tenantId") REFERENCES "Medicine"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- ==========================================
-- CUSTOM HOSPITAL RULES & CONSTRAINTS
-- ==========================================

ALTER TABLE "Encounter"
  ADD CONSTRAINT "Encounter_type_check" CHECK ("type" IN ('outpatient', 'inpatient', 'emergency')),
  ADD CONSTRAINT "Encounter_source_check" CHECK ("source" IN ('appointment', 'walk_in', 'emergency', 'referral')),
  ADD CONSTRAINT "Encounter_status_check" CHECK ("status" IN ('waiting', 'in_progress', 'closed')),
  ADD CONSTRAINT "Encounter_disposition_check" CHECK ("disposition" IS NULL OR "disposition" IN ('discharged_home', 'admitted', 'transferred', 'referred_out', 'left_without_being_seen', 'deceased')),
  ADD CONSTRAINT "Encounter_triageLevel_check" CHECK ("triageLevel" IS NULL OR "triageLevel" IN ('critical', 'urgent', 'normal')),
  ADD CONSTRAINT "Encounter_arrivalMode_check" CHECK ("arrivalMode" IS NULL OR "arrivalMode" IN ('walk_in', 'ambulance', 'referral')),
  ADD CONSTRAINT "Encounter_endedAt_check" CHECK ("endedAt" IS NULL OR "endedAt" >= "startedAt"),
  ADD CONSTRAINT "Encounter_closed_time_check" CHECK (("status" = 'closed') = ("endedAt" IS NOT NULL)),
  ADD CONSTRAINT "Encounter_queue_check" CHECK (("queueDate" IS NULL) = ("queueNumber" IS NULL) AND ("queueNumber" IS NULL OR "queueNumber" > 0)),
  ADD CONSTRAINT "Encounter_version_check" CHECK ("version" > 0);

ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_kind_check" CHECK ("kind" IN ('initial', 'ward_round', 'pre_operative'));
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_status_check" CHECK ("status" IN ('active', 'cancelled'));
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_durationDays_check" CHECK ("durationDays" IS NULL OR "durationDays" > 0);

ALTER TABLE "Admission"
  ADD CONSTRAINT "Admission_status_check" CHECK ("status" IN ('admitted', 'discharged')),
  ADD CONSTRAINT "Admission_dischargeType_check" CHECK ("dischargeType" IS NULL OR "dischargeType" IN ('routine', 'against_medical_advice', 'transferred', 'deceased')),
  ADD CONSTRAINT "Admission_dischargedAt_check" CHECK ("dischargedAt" IS NULL OR "dischargedAt" >= "admittedAt"),
  ADD CONSTRAINT "Admission_discharged_time_check" CHECK (("status" = 'discharged') = ("dischargedAt" IS NOT NULL)),
  ADD CONSTRAINT "Admission_dischargeType_status_check" CHECK ("dischargeType" IS NULL OR "status" = 'discharged'),
  ADD CONSTRAINT "Admission_version_check" CHECK ("version" > 0);

ALTER TABLE "BedAssignment" ADD CONSTRAINT "BedAssignment_releasedAt_check" CHECK ("releasedAt" IS NULL OR "releasedAt" >= "assignedAt");

ALTER TABLE "SurgeryCase"
  ADD CONSTRAINT "SurgeryCase_status_check" CHECK ("status" IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'postponed')),
  ADD CONSTRAINT "SurgeryCase_anesthesiaType_check" CHECK ("anesthesiaType" IS NULL OR "anesthesiaType" IN ('general', 'regional', 'local', 'sedation')),
  ADD CONSTRAINT "SurgeryCase_duration_check" CHECK ("durationMinutes" > 0),
  ADD CONSTRAINT "SurgeryCase_endedAt_check" CHECK ("endedAt" IS NULL OR ("startedAt" IS NOT NULL AND "endedAt" >= "startedAt")),
  ADD CONSTRAINT "SurgeryCase_version_check" CHECK ("version" > 0);

ALTER TABLE "SurgeryTeamMember" ADD CONSTRAINT "SurgeryTeamMember_role_check" CHECK ("role" IN ('assistant_surgeon', 'anesthetist', 'scrub_nurse', 'circulating_nurse'));

-- PHARMACY & INVENTORY RULES
ALTER TABLE "Pharmacy" ADD CONSTRAINT "Pharmacy_type_check" CHECK ("type" IN ('central_store', 'sub_store'));
ALTER TABLE "StockTransaction" 
  ADD CONSTRAINT "StockTransaction_type_check" CHECK ("type" IN ('IN', 'OUT', 'TRANSFER')),
  ADD CONSTRAINT "StockTransaction_quantity_check" CHECK ("quantity" > 0);
ALTER TABLE "StockRequest" ADD CONSTRAINT "StockRequest_status_check" CHECK ("status" IN ('pending', 'approved', 'rejected', 'dispatched', 'received'));

-- UNIQUE ACTIVE INDEXES
CREATE UNIQUE INDEX "BedAssignment_one_active_per_bed" ON "BedAssignment" ("bedId") WHERE "releasedAt" IS NULL;
CREATE UNIQUE INDEX "BedAssignment_one_active_per_encounter" ON "BedAssignment" ("encounterId") WHERE "releasedAt" IS NULL;
CREATE UNIQUE INDEX "Bed_one_active_per_patient" ON "Bed" ("currentPatientId") WHERE "currentPatientId" IS NOT NULL;

-- OVERLAP CONSTRAINTS (Requires btree_gist)
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE OR REPLACE FUNCTION carebase_add_minutes(ts timestamptz, mins integer)
RETURNS timestamptz LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT SET search_path = pg_catalog
AS $$ SELECT ts + mins * interval '1 minute' $$;

ALTER TABLE "SurgeryCase" ADD CONSTRAINT "SurgeryCase_no_theatre_overlap" EXCLUDE USING gist (
  "tenantId" WITH =, "theatreId" WITH =, tstzrange("scheduledAt", carebase_add_minutes("scheduledAt", "durationMinutes"), '[)') WITH &&
) WHERE ("status" IN ('scheduled', 'in_progress'));

ALTER TABLE "SurgeryCase" ADD CONSTRAINT "SurgeryCase_no_surgeon_overlap" EXCLUDE USING gist (
  "tenantId" WITH =, "surgeonId" WITH =, tstzrange("scheduledAt", carebase_add_minutes("scheduledAt", "durationMinutes"), '[)') WITH &&
) WHERE ("status" IN ('scheduled', 'in_progress'));

ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_status_check" CHECK ("status" IN ('booked', 'completed', 'cancelled', 'no_show')),
  ADD CONSTRAINT "Appointment_duration_check" CHECK ("durationMinutes" BETWEEN 5 AND 480);

ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_no_doctor_overlap" EXCLUDE USING gist (
  "tenantId" WITH =, "doctorId" WITH =, tstzrange("scheduledAt", carebase_add_minutes("scheduledAt", "durationMinutes"), '[)') WITH &&
) WHERE ("status" = 'booked');

ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_no_patient_overlap" EXCLUDE USING gist (
  "tenantId" WITH =, "patientId" WITH =, tstzrange("scheduledAt", carebase_add_minutes("scheduledAt", "durationMinutes"), '[)') WITH &&
) WHERE ("status" = 'booked');