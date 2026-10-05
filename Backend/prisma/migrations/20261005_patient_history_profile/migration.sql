ALTER TABLE public."Patient"
    ADD COLUMN "insuranceProvider" text,
    ADD COLUMN "insurancePolicyNumber" text;

ALTER TABLE public."PatientMedicalData"
    ADD COLUMN allergies text,
    ADD COLUMN "chronicConditions" text,
    ADD COLUMN "pastSurgeries" text;