--
-- PostgreSQL database dump
--



-- Dumped from database version 18.6 (Ubuntu 18.6-0ubuntu0.26.04.1)
-- Dumped by pg_dump version 18.6 (Ubuntu 18.6-0ubuntu0.26.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Appointment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Appointment" (
    "createdAt" timestamp with time zone NOT NULL,
    "createdBy" character(36),
    "departmentId" character(36) NOT NULL,
    "doctorId" character(36) NOT NULL,
    "durationMinutes" integer DEFAULT 30 NOT NULL,
    id character(36) NOT NULL,
    notes text,
    "patientId" character(36) NOT NULL,
    "scheduledAt" timestamp with time zone NOT NULL,
    status text DEFAULT 'booked'::text NOT NULL,
    "tenantId" character(36) NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "updatedBy" character(36),
    version integer DEFAULT 1 NOT NULL,
    CONSTRAINT "Appointment_status_check_a8851325" CHECK ((status = ANY (ARRAY['booked'::text, 'completed'::text, 'cancelled'::text, 'no_show'::text])))
);


--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AuditLog" (
    action text NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "entityId" character(36),
    "entityType" text NOT NULL,
    id character(36) NOT NULL,
    "ipAddress" text,
    "newValue" jsonb,
    "oldValue" jsonb,
    "tenantId" character(36),
    "userAgent" text,
    "userId" character(36)
);


--
-- Name: Bed; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Bed" (
    code text NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "currentPatientId" character(36),
    id character(36) NOT NULL,
    "roomId" character(36) NOT NULL,
    status text DEFAULT 'available'::text NOT NULL,
    "tenantId" character(36) NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    CONSTRAINT "Bed_status_check_b354a3db" CHECK ((status = ANY (ARRAY['available'::text, 'occupied'::text, 'maintenance'::text, 'cleaning'::text])))
);


--
-- Name: Department; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Department" (
    "createdAt" timestamp with time zone NOT NULL,
    id character(36) NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    name text NOT NULL,
    "tenantId" character(36) NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: DoctorProfile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DoctorProfile" (
    "createdAt" timestamp with time zone NOT NULL,
    "departmentId" character(36) NOT NULL,
    id character(36) NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "licenseNumber" text,
    qualifications text,
    specialization text NOT NULL,
    "tenantId" character(36) NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "userId" character(36) NOT NULL,
    description text,
    designation text,
    phone text NOT NULL,
    "employeeId" text NOT NULL
);


--
-- Name: Patient; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Patient" (
    address text,
    "contactEmail" text,
    "contactPhone" text,
    "createdAt" timestamp with time zone NOT NULL,
    "deletedAt" timestamp with time zone,
    dob timestamp with time zone NOT NULL,
    "emergencyContactName" text,
    "emergencyContactPhone" text,
    "firstName" text NOT NULL,
    gender text,
    id character(36) NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "lastName" text NOT NULL,
    mrn text NOT NULL,
    "tenantId" character(36) NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    CONSTRAINT "Patient_gender_check_f90b1c49" CHECK ((gender = ANY (ARRAY['male'::text, 'female'::text, 'other'::text])))
);


--
-- Name: Role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Role" (
    "createdAt" timestamp with time zone NOT NULL,
    id character(36) NOT NULL,
    name text NOT NULL,
    "tenantId" character(36) NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: Room; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Room" (
    "createdAt" timestamp with time zone NOT NULL,
    id character(36) NOT NULL,
    name text NOT NULL,
    "tenantId" character(36) NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "wardId" character(36) NOT NULL
);


--
-- Name: Session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Session" (
    "createdAt" timestamp with time zone NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    id character(36) NOT NULL,
    "ipAddress" text,
    "revokedAt" timestamp with time zone,
    "tokenHash" text NOT NULL,
    "userAgent" text,
    "userId" character(36) NOT NULL
);


--
-- Name: StaffProfile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StaffProfile" (
    "createdAt" timestamp with time zone NOT NULL,
    "departmentId" character(36),
    "employeeId" text NOT NULL,
    id character(36) NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "joiningDate" timestamp with time zone,
    phone text,
    shift text,
    "tenantId" character(36) NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "userId" character(36) NOT NULL,
    "wardId" character(36),
    description text,
    designation text,
    CONSTRAINT "StaffProfile_shift_check_fa4bb835" CHECK ((shift = ANY (ARRAY['morning'::text, 'evening'::text, 'night'::text, 'flexible'::text])))
);


--
-- Name: Tenant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Tenant" (
    "createdAt" timestamp with time zone NOT NULL,
    id character(36) NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    address text,
    city text,
    country text DEFAULT 'PK'::text NOT NULL,
    "postalCode" text,
    state text,
    favicon text NOT NULL,
    logo text NOT NULL
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    "createdAt" timestamp with time zone NOT NULL,
    email text NOT NULL,
    id character(36) NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "isSuperAdmin" boolean DEFAULT false NOT NULL,
    name text NOT NULL,
    "passwordHash" text NOT NULL,
    "roleId" character(36),
    "tenantId" character(36),
    "updatedAt" timestamp with time zone NOT NULL,
    "authProvider" text DEFAULT 'local'::text
);


--
-- Name: Ward; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Ward" (
    "createdAt" timestamp with time zone NOT NULL,
    "departmentId" character(36),
    id character(36) NOT NULL,
    name text NOT NULL,
    "tenantId" character(36) NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: Appointment Appointment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Appointment"
    ADD CONSTRAINT "Appointment_pkey" PRIMARY KEY (id);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: Bed Bed_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Bed"
    ADD CONSTRAINT "Bed_pkey" PRIMARY KEY (id);


--
-- Name: Department Department_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Department"
    ADD CONSTRAINT "Department_pkey" PRIMARY KEY (id);


--
-- Name: DoctorProfile DoctorProfile_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DoctorProfile"
    ADD CONSTRAINT "DoctorProfile_phone_key" UNIQUE (phone);


--
-- Name: DoctorProfile DoctorProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DoctorProfile"
    ADD CONSTRAINT "DoctorProfile_pkey" PRIMARY KEY (id);


--
-- Name: DoctorProfile DoctorProfile_userId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DoctorProfile"
    ADD CONSTRAINT "DoctorProfile_userId_key" UNIQUE ("userId");


--
-- Name: Patient Patient_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Patient"
    ADD CONSTRAINT "Patient_pkey" PRIMARY KEY (id);


--
-- Name: Role Role_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_pkey" PRIMARY KEY (id);


--
-- Name: Room Room_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Room"
    ADD CONSTRAINT "Room_pkey" PRIMARY KEY (id);


--
-- Name: Session Session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY (id);


--
-- Name: Session Session_tokenHash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_tokenHash_key" UNIQUE ("tokenHash");


--
-- Name: StaffProfile StaffProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StaffProfile"
    ADD CONSTRAINT "StaffProfile_pkey" PRIMARY KEY (id);


--
-- Name: StaffProfile StaffProfile_userId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StaffProfile"
    ADD CONSTRAINT "StaffProfile_userId_key" UNIQUE ("userId");


--
-- Name: Tenant Tenant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Tenant"
    ADD CONSTRAINT "Tenant_pkey" PRIMARY KEY (id);


--
-- Name: Tenant Tenant_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Tenant"
    ADD CONSTRAINT "Tenant_slug_key" UNIQUE (slug);


--
-- Name: User User_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_email_key" UNIQUE (email);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: Ward Ward_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Ward"
    ADD CONSTRAINT "Ward_pkey" PRIMARY KEY (id);


--
-- Name: Appointment_createdBy_idx_ba0f792f; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Appointment_createdBy_idx_ba0f792f" ON public."Appointment" USING btree ("createdBy");


--
-- Name: Appointment_departmentId_idx_8e261ed8; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Appointment_departmentId_idx_8e261ed8" ON public."Appointment" USING btree ("departmentId");


--
-- Name: Appointment_doctorId_idx_04369053; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Appointment_doctorId_idx_04369053" ON public."Appointment" USING btree ("doctorId");


--
-- Name: Appointment_patientId_idx_e5f07e88; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Appointment_patientId_idx_e5f07e88" ON public."Appointment" USING btree ("patientId");


--
-- Name: Appointment_tenantId_idx_c93ed4f1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Appointment_tenantId_idx_c93ed4f1" ON public."Appointment" USING btree ("tenantId");


--
-- Name: Appointment_tenantId_scheduledAt_idx_31e2839e; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Appointment_tenantId_scheduledAt_idx_31e2839e" ON public."Appointment" USING btree ("tenantId", "scheduledAt");


--
-- Name: Appointment_updatedBy_idx_0780dcde; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Appointment_updatedBy_idx_0780dcde" ON public."Appointment" USING btree ("updatedBy");


--
-- Name: AuditLog_entityType_entityId_idx_ea0fa809; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_entityType_entityId_idx_ea0fa809" ON public."AuditLog" USING btree ("entityType", "entityId");


--
-- Name: AuditLog_tenantId_createdAt_idx_88162366; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_tenantId_createdAt_idx_88162366" ON public."AuditLog" USING btree ("tenantId", "createdAt");


--
-- Name: AuditLog_tenantId_idx_c93ed4f1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_tenantId_idx_c93ed4f1" ON public."AuditLog" USING btree ("tenantId");


--
-- Name: AuditLog_userId_idx_a489d58a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_userId_idx_a489d58a" ON public."AuditLog" USING btree ("userId");


--
-- Name: Bed_currentPatientId_idx_41689716; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Bed_currentPatientId_idx_41689716" ON public."Bed" USING btree ("currentPatientId");


--
-- Name: Bed_roomId_idx_fe51d647; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Bed_roomId_idx_fe51d647" ON public."Bed" USING btree ("roomId");


--
-- Name: Bed_tenantId_idx_c93ed4f1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Bed_tenantId_idx_c93ed4f1" ON public."Bed" USING btree ("tenantId");


--
-- Name: Department_tenantId_idx_c93ed4f1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Department_tenantId_idx_c93ed4f1" ON public."Department" USING btree ("tenantId");


--
-- Name: DoctorProfile_departmentId_idx_8e261ed8; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DoctorProfile_departmentId_idx_8e261ed8" ON public."DoctorProfile" USING btree ("departmentId");


--
-- Name: DoctorProfile_tenantId_idx_c93ed4f1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DoctorProfile_tenantId_idx_c93ed4f1" ON public."DoctorProfile" USING btree ("tenantId");


--
-- Name: Patient_tenantId_idx_c93ed4f1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Patient_tenantId_idx_c93ed4f1" ON public."Patient" USING btree ("tenantId");


--
-- Name: Patient_tenantId_lastName_idx_8d5f431c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Patient_tenantId_lastName_idx_8d5f431c" ON public."Patient" USING btree ("tenantId", "lastName");


--
-- Name: Role_tenantId_idx_c93ed4f1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Role_tenantId_idx_c93ed4f1" ON public."Role" USING btree ("tenantId");


--
-- Name: Room_tenantId_idx_c93ed4f1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Room_tenantId_idx_c93ed4f1" ON public."Room" USING btree ("tenantId");


--
-- Name: Room_wardId_idx_6180a90a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Room_wardId_idx_6180a90a" ON public."Room" USING btree ("wardId");


--
-- Name: Session_expiresAt_idx_6b6b8c10; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Session_expiresAt_idx_6b6b8c10" ON public."Session" USING btree ("expiresAt");


--
-- Name: Session_revokedAt_idx_f1d8e6b3; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Session_revokedAt_idx_f1d8e6b3" ON public."Session" USING btree ("revokedAt");


--
-- Name: Session_userId_idx_a489d58a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Session_userId_idx_a489d58a" ON public."Session" USING btree ("userId");


--
-- Name: StaffProfile_departmentId_idx_8e261ed8; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StaffProfile_departmentId_idx_8e261ed8" ON public."StaffProfile" USING btree ("departmentId");


--
-- Name: StaffProfile_tenantId_idx_c93ed4f1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StaffProfile_tenantId_idx_c93ed4f1" ON public."StaffProfile" USING btree ("tenantId");


--
-- Name: StaffProfile_wardId_idx_6180a90a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StaffProfile_wardId_idx_6180a90a" ON public."StaffProfile" USING btree ("wardId");


--
-- Name: User_roleId_idx_ffccc9a4; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_roleId_idx_ffccc9a4" ON public."User" USING btree ("roleId");


--
-- Name: User_tenantId_idx_c93ed4f1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_tenantId_idx_c93ed4f1" ON public."User" USING btree ("tenantId");


--
-- Name: Ward_departmentId_idx_8e261ed8; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Ward_departmentId_idx_8e261ed8" ON public."Ward" USING btree ("departmentId");


--
-- Name: Ward_tenantId_idx_c93ed4f1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Ward_tenantId_idx_c93ed4f1" ON public."Ward" USING btree ("tenantId");


--
-- Name: appointment_doctor_schedule_idx_23b246b0; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX appointment_doctor_schedule_idx_23b246b0 ON public."Appointment" USING btree ("doctorId", "scheduledAt");


--
-- Name: bed_room_code_key_aff24a4e; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX bed_room_code_key_aff24a4e ON public."Bed" USING btree ("roomId", code);


--
-- Name: department_tenant_name_key_efdfefee; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX department_tenant_name_key_efdfefee ON public."Department" USING btree ("tenantId", name);


--
-- Name: patient_tenant_mrn_key_0c21d836; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX patient_tenant_mrn_key_0c21d836 ON public."Patient" USING btree ("tenantId", mrn);


--
-- Name: role_tenant_name_key_efdfefee; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX role_tenant_name_key_efdfefee ON public."Role" USING btree ("tenantId", name);


--
-- Name: staffProfile_tenant_employeeId_key_c90418e2; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "staffProfile_tenant_employeeId_key_c90418e2" ON public."StaffProfile" USING btree ("tenantId", "employeeId");


--
-- Name: Appointment appointment_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Appointment"
    ADD CONSTRAINT "appointment_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public."User"(id) ON DELETE SET NULL;


--
-- Name: Appointment appointment_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Appointment"
    ADD CONSTRAINT "appointment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public."Department"(id) ON DELETE RESTRICT;


--
-- Name: Appointment appointment_doctorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Appointment"
    ADD CONSTRAINT "appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES public."DoctorProfile"(id) ON DELETE RESTRICT;


--
-- Name: Appointment appointment_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Appointment"
    ADD CONSTRAINT "appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public."Patient"(id) ON DELETE RESTRICT;


--
-- Name: Appointment appointment_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Appointment"
    ADD CONSTRAINT "appointment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON DELETE CASCADE;


--
-- Name: Appointment appointment_updatedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Appointment"
    ADD CONSTRAINT "appointment_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES public."User"(id) ON DELETE SET NULL;


--
-- Name: AuditLog auditLog_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "auditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON DELETE SET NULL;


--
-- Name: AuditLog auditLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "auditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON DELETE SET NULL;


--
-- Name: Bed bed_currentPatientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Bed"
    ADD CONSTRAINT "bed_currentPatientId_fkey" FOREIGN KEY ("currentPatientId") REFERENCES public."Patient"(id) ON DELETE SET NULL;


--
-- Name: Bed bed_roomId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Bed"
    ADD CONSTRAINT "bed_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES public."Room"(id) ON DELETE CASCADE;


--
-- Name: Bed bed_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Bed"
    ADD CONSTRAINT "bed_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON DELETE CASCADE;


--
-- Name: Department department_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Department"
    ADD CONSTRAINT "department_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON DELETE CASCADE;


--
-- Name: DoctorProfile doctorProfile_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DoctorProfile"
    ADD CONSTRAINT "doctorProfile_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public."Department"(id) ON DELETE RESTRICT;


--
-- Name: DoctorProfile doctorProfile_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DoctorProfile"
    ADD CONSTRAINT "doctorProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON DELETE CASCADE;


--
-- Name: DoctorProfile doctorProfile_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DoctorProfile"
    ADD CONSTRAINT "doctorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON DELETE CASCADE;


--
-- Name: Patient patient_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Patient"
    ADD CONSTRAINT "patient_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON DELETE RESTRICT;


--
-- Name: Role role_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "role_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON DELETE CASCADE;


--
-- Name: Room room_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Room"
    ADD CONSTRAINT "room_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON DELETE CASCADE;


--
-- Name: Room room_wardId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Room"
    ADD CONSTRAINT "room_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES public."Ward"(id) ON DELETE CASCADE;


--
-- Name: Session session_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON DELETE CASCADE;


--
-- Name: StaffProfile staffProfile_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StaffProfile"
    ADD CONSTRAINT "staffProfile_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public."Department"(id) ON DELETE SET NULL;


--
-- Name: StaffProfile staffProfile_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StaffProfile"
    ADD CONSTRAINT "staffProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON DELETE CASCADE;


--
-- Name: StaffProfile staffProfile_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StaffProfile"
    ADD CONSTRAINT "staffProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON DELETE CASCADE;


--
-- Name: StaffProfile staffProfile_wardId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StaffProfile"
    ADD CONSTRAINT "staffProfile_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES public."Ward"(id) ON DELETE SET NULL;


--
-- Name: User user_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "user_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."Role"(id) ON DELETE SET NULL;


--
-- Name: User user_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "user_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON DELETE CASCADE;


--
-- Name: Ward ward_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Ward"
    ADD CONSTRAINT "ward_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public."Department"(id) ON DELETE SET NULL;


--
-- Name: Ward ward_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Ward"
    ADD CONSTRAINT "ward_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--


