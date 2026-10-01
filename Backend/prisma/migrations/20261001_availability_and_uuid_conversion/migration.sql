BEGIN;

ALTER TABLE public."Appointment"
    DROP CONSTRAINT "appointment_createdBy_fkey",
    DROP CONSTRAINT "appointment_departmentId_fkey",
    DROP CONSTRAINT "appointment_doctorId_fkey",
    DROP CONSTRAINT "appointment_patientId_fkey",
    DROP CONSTRAINT "appointment_tenantId_fkey",
    DROP CONSTRAINT "appointment_updatedBy_fkey";
ALTER TABLE public."AuditLog"
    DROP CONSTRAINT "auditLog_tenantId_fkey",
    DROP CONSTRAINT "auditLog_userId_fkey";
ALTER TABLE public."Bed"
    DROP CONSTRAINT "bed_currentPatientId_fkey",
    DROP CONSTRAINT "bed_roomId_fkey",
    DROP CONSTRAINT "bed_tenantId_fkey";
ALTER TABLE public."Department"
    DROP CONSTRAINT "department_tenantId_fkey";
ALTER TABLE public."DoctorProfile"
    DROP CONSTRAINT "doctorProfile_departmentId_fkey",
    DROP CONSTRAINT "doctorProfile_tenantId_fkey",
    DROP CONSTRAINT "doctorProfile_userId_fkey";
ALTER TABLE public."Patient"
    DROP CONSTRAINT "patient_tenantId_fkey";
ALTER TABLE public."Role"
    DROP CONSTRAINT "role_tenantId_fkey";
ALTER TABLE public."Room"
    DROP CONSTRAINT "room_tenantId_fkey",
    DROP CONSTRAINT "room_wardId_fkey";
ALTER TABLE public."Session"
    DROP CONSTRAINT "session_userId_fkey";
ALTER TABLE public."StaffProfile"
    DROP CONSTRAINT "staffProfile_departmentId_fkey",
    DROP CONSTRAINT "staffProfile_tenantId_fkey",
    DROP CONSTRAINT "staffProfile_userId_fkey",
    DROP CONSTRAINT "staffProfile_wardId_fkey";
ALTER TABLE public."User"
    DROP CONSTRAINT "user_roleId_fkey",
    DROP CONSTRAINT "user_tenantId_fkey";
ALTER TABLE public."Ward"
    DROP CONSTRAINT "ward_departmentId_fkey",
    DROP CONSTRAINT "ward_tenantId_fkey";

ALTER TABLE public."Appointment"
    ALTER COLUMN "createdBy" TYPE uuid USING btrim("createdBy")::uuid,
    ALTER COLUMN "departmentId" TYPE uuid USING btrim("departmentId")::uuid,
    ALTER COLUMN "doctorId" TYPE uuid USING btrim("doctorId")::uuid,
    ALTER COLUMN id TYPE uuid USING btrim(id)::uuid,
    ALTER COLUMN "patientId" TYPE uuid USING btrim("patientId")::uuid,
    ALTER COLUMN "tenantId" TYPE uuid USING btrim("tenantId")::uuid,
    ALTER COLUMN "updatedBy" TYPE uuid USING btrim("updatedBy")::uuid;
ALTER TABLE public."AuditLog"
    ALTER COLUMN "entityId" TYPE uuid USING btrim("entityId")::uuid,
    ALTER COLUMN id TYPE uuid USING btrim(id)::uuid,
    ALTER COLUMN "tenantId" TYPE uuid USING btrim("tenantId")::uuid,
    ALTER COLUMN "userId" TYPE uuid USING btrim("userId")::uuid;
ALTER TABLE public."Bed"
    ALTER COLUMN "currentPatientId" TYPE uuid USING btrim("currentPatientId")::uuid,
    ALTER COLUMN id TYPE uuid USING btrim(id)::uuid,
    ALTER COLUMN "roomId" TYPE uuid USING btrim("roomId")::uuid,
    ALTER COLUMN "tenantId" TYPE uuid USING btrim("tenantId")::uuid;
ALTER TABLE public."Department"
    ALTER COLUMN id TYPE uuid USING btrim(id)::uuid,
    ALTER COLUMN "tenantId" TYPE uuid USING btrim("tenantId")::uuid;
ALTER TABLE public."DoctorProfile"
    ALTER COLUMN "departmentId" TYPE uuid USING btrim("departmentId")::uuid,
    ALTER COLUMN id TYPE uuid USING btrim(id)::uuid,
    ALTER COLUMN "tenantId" TYPE uuid USING btrim("tenantId")::uuid,
    ALTER COLUMN "userId" TYPE uuid USING btrim("userId")::uuid;
ALTER TABLE public."Patient"
    ALTER COLUMN id TYPE uuid USING btrim(id)::uuid,
    ALTER COLUMN "tenantId" TYPE uuid USING btrim("tenantId")::uuid;
ALTER TABLE public."Role"
    ALTER COLUMN id TYPE uuid USING btrim(id)::uuid,
    ALTER COLUMN "tenantId" TYPE uuid USING btrim("tenantId")::uuid;
ALTER TABLE public."Room"
    ALTER COLUMN id TYPE uuid USING btrim(id)::uuid,
    ALTER COLUMN "tenantId" TYPE uuid USING btrim("tenantId")::uuid,
    ALTER COLUMN "wardId" TYPE uuid USING btrim("wardId")::uuid;
ALTER TABLE public."Session"
    ALTER COLUMN id TYPE uuid USING btrim(id)::uuid,
    ALTER COLUMN "userId" TYPE uuid USING btrim("userId")::uuid;
ALTER TABLE public."StaffProfile"
    DROP CONSTRAINT IF EXISTS "StaffProfile_shift_check_fa4bb835",
    DROP COLUMN IF EXISTS "shift",
    ALTER COLUMN "departmentId" TYPE uuid USING btrim("departmentId")::uuid,
    ALTER COLUMN id TYPE uuid USING btrim(id)::uuid,
    ALTER COLUMN "tenantId" TYPE uuid USING btrim("tenantId")::uuid,
    ALTER COLUMN "userId" TYPE uuid USING btrim("userId")::uuid,
    ALTER COLUMN "wardId" TYPE uuid USING btrim("wardId")::uuid;
ALTER TABLE public."Tenant"
    ALTER COLUMN id TYPE uuid USING btrim(id)::uuid;
ALTER TABLE public."User"
    ALTER COLUMN id TYPE uuid USING btrim(id)::uuid,
    ALTER COLUMN "roleId" TYPE uuid USING btrim("roleId")::uuid,
    ALTER COLUMN "tenantId" TYPE uuid USING btrim("tenantId")::uuid;
ALTER TABLE public."Ward"
    ALTER COLUMN "departmentId" TYPE uuid USING btrim("departmentId")::uuid,
    ALTER COLUMN id TYPE uuid USING btrim(id)::uuid,
    ALTER COLUMN "tenantId" TYPE uuid USING btrim("tenantId")::uuid;

CREATE UNIQUE INDEX "doctorProfile_id_tenantId_key"
    ON public."DoctorProfile"(id, "tenantId");
CREATE UNIQUE INDEX "staffProfile_id_tenantId_key"
    ON public."StaffProfile"(id, "tenantId");

CREATE TABLE public."DoctorAvailability" (
    id uuid NOT NULL,
    "dayOfWeek" integer NOT NULL,
    "startMinute" integer NOT NULL,
    "endMinute" integer NOT NULL,
    "isActive" boolean NOT NULL DEFAULT true,
    "doctorId" uuid NOT NULL,
    "tenantId" uuid NOT NULL,
    CONSTRAINT "DoctorAvailability_pkey" PRIMARY KEY (id),
    CONSTRAINT "DoctorAvailability_dayOfWeek_check" CHECK ("dayOfWeek" BETWEEN 0 AND 6),
    CONSTRAINT "DoctorAvailability_minutes_check" CHECK ("startMinute" >= 0 AND "startMinute" < "endMinute" AND "endMinute" <= 1440)
);
CREATE TABLE public."StaffAvailability" (
    id uuid NOT NULL,
    "dayOfWeek" integer NOT NULL,
    "startMinute" integer NOT NULL,
    "endMinute" integer NOT NULL,
    "isActive" boolean NOT NULL DEFAULT true,
    "staffId" uuid NOT NULL,
    "tenantId" uuid NOT NULL,
    CONSTRAINT "StaffAvailability_pkey" PRIMARY KEY (id),
    CONSTRAINT "StaffAvailability_dayOfWeek_check" CHECK ("dayOfWeek" BETWEEN 0 AND 6),
    CONSTRAINT "StaffAvailability_minutes_check" CHECK ("startMinute" >= 0 AND "startMinute" < "endMinute" AND "endMinute" <= 1440)
);

CREATE INDEX "doctorAvailability_schedule_idx"
    ON public."DoctorAvailability"("tenantId", "doctorId", "dayOfWeek", "isActive");
CREATE INDEX "doctorAvailability_doctorId_idx"
    ON public."DoctorAvailability"("doctorId");
CREATE INDEX "staffAvailability_schedule_idx"
    ON public."StaffAvailability"("tenantId", "staffId", "dayOfWeek", "isActive");
CREATE INDEX "staffAvailability_staffId_idx"
    ON public."StaffAvailability"("staffId");

ALTER TABLE public."Appointment"
    ADD CONSTRAINT "appointment_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public."User"(id) ON DELETE SET NULL ON UPDATE NO ACTION,
    ADD CONSTRAINT "appointment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public."Department"(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
    ADD CONSTRAINT "appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES public."DoctorProfile"(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
    ADD CONSTRAINT "appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public."Patient"(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
    ADD CONSTRAINT "appointment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON DELETE CASCADE ON UPDATE NO ACTION,
    ADD CONSTRAINT "appointment_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES public."User"(id) ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE public."AuditLog"
    ADD CONSTRAINT "auditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON DELETE SET NULL ON UPDATE NO ACTION,
    ADD CONSTRAINT "auditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE public."Bed"
    ADD CONSTRAINT "bed_currentPatientId_fkey" FOREIGN KEY ("currentPatientId") REFERENCES public."Patient"(id) ON DELETE SET NULL ON UPDATE NO ACTION,
    ADD CONSTRAINT "bed_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES public."Room"(id) ON DELETE CASCADE ON UPDATE NO ACTION,
    ADD CONSTRAINT "bed_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE public."Department"
    ADD CONSTRAINT "department_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE public."DoctorProfile"
    ADD CONSTRAINT "doctorProfile_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public."Department"(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
    ADD CONSTRAINT "doctorProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON DELETE CASCADE ON UPDATE NO ACTION,
    ADD CONSTRAINT "doctorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE public."DoctorAvailability"
    ADD CONSTRAINT "doctorAvailability_doctorId_fkey" FOREIGN KEY ("doctorId", "tenantId") REFERENCES public."DoctorProfile"(id, "tenantId") ON DELETE CASCADE ON UPDATE NO ACTION,
    ADD CONSTRAINT "doctorAvailability_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE public."Patient"
    ADD CONSTRAINT "patient_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE public."Role"
    ADD CONSTRAINT "role_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE public."Room"
    ADD CONSTRAINT "room_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON DELETE CASCADE ON UPDATE NO ACTION,
    ADD CONSTRAINT "room_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES public."Ward"(id) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE public."Session"
    ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE public."StaffProfile"
    ADD CONSTRAINT "staffProfile_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public."Department"(id) ON DELETE SET NULL ON UPDATE NO ACTION,
    ADD CONSTRAINT "staffProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON DELETE CASCADE ON UPDATE NO ACTION,
    ADD CONSTRAINT "staffProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON DELETE CASCADE ON UPDATE NO ACTION,
    ADD CONSTRAINT "staffProfile_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES public."Ward"(id) ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE public."StaffAvailability"
    ADD CONSTRAINT "staffAvailability_staffId_fkey" FOREIGN KEY ("staffId", "tenantId") REFERENCES public."StaffProfile"(id, "tenantId") ON DELETE CASCADE ON UPDATE NO ACTION,
    ADD CONSTRAINT "staffAvailability_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE public."User"
    ADD CONSTRAINT "user_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."Role"(id) ON DELETE SET NULL ON UPDATE NO ACTION,
    ADD CONSTRAINT "user_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE public."Ward"
    ADD CONSTRAINT "ward_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public."Department"(id) ON DELETE SET NULL ON UPDATE NO ACTION,
    ADD CONSTRAINT "ward_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON DELETE CASCADE ON UPDATE NO ACTION;

COMMIT;