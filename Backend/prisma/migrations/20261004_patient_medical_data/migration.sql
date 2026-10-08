BEGIN;

CREATE UNIQUE INDEX "patient_id_tenantId_key"
    ON public."Patient"(id, "tenantId");

CREATE TABLE public."PatientMedicalData" (
    id uuid NOT NULL,
    "recordedAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "heartRate" integer,
    "totalCholesterol" integer,
    hemoglobin double precision,
    "systolicBloodPressure" integer,
    "diastolicBloodPressure" integer,
    "bloodGlucose" integer,
    "whiteBloodCellCount" integer,
    "bodyMassIndex" double precision,
    "respiratoryRate" integer,
    "plateletCount" integer,
    note text,
    "patientId" uuid NOT NULL,
    "tenantId" uuid NOT NULL,
    "recordedBy" uuid,
    CONSTRAINT "PatientMedicalData_pkey" PRIMARY KEY (id),
    CONSTRAINT "PatientMedicalData_bloodPressure_pair_check"
        CHECK (("systolicBloodPressure" IS NULL) = ("diastolicBloodPressure" IS NULL))
);

CREATE INDEX "patientMedicalData_tenant_patient_recordedAt_idx"
    ON public."PatientMedicalData"("tenantId", "patientId", "recordedAt");
CREATE INDEX "patientMedicalData_patient_recordedAt_idx"
    ON public."PatientMedicalData"("patientId", "recordedAt");
CREATE INDEX "patientMedicalData_recordedBy_idx"
    ON public."PatientMedicalData"("recordedBy");

ALTER TABLE public."PatientMedicalData"
    ADD CONSTRAINT "patientMedicalData_patient_tenant_fkey"
        FOREIGN KEY ("patientId", "tenantId")
        REFERENCES public."Patient"(id, "tenantId") ON DELETE CASCADE ON UPDATE NO ACTION,
    ADD CONSTRAINT "patientMedicalData_tenantId_fkey"
        FOREIGN KEY ("tenantId")
        REFERENCES public."Tenant"(id) ON DELETE CASCADE ON UPDATE NO ACTION,
    ADD CONSTRAINT "patientMedicalData_recordedBy_fkey"
        FOREIGN KEY ("recordedBy")
        REFERENCES public."User"(id) ON DELETE SET NULL ON UPDATE NO ACTION;

COMMIT;