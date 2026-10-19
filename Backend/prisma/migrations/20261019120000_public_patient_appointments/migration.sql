-- Public, no-account appointment booking access. Only a hash of the
-- high-entropy booking code is stored; the original is returned once and
-- emailed to the patient.
CREATE TABLE "PublicAppointmentAccess" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appointmentId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "bookingCodeHash" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PublicAppointmentAccess_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PublicAppointmentAccess_appointmentId_tenantId_key" UNIQUE ("appointmentId", "tenantId"),
    CONSTRAINT "PublicAppointmentAccess_bookingCodeHash_key" UNIQUE ("bookingCodeHash"),
    CONSTRAINT "PublicAppointmentAccess_Appointment_fkey" FOREIGN KEY ("appointmentId", "tenantId")
        REFERENCES "Appointment"("id", "tenantId") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX "PublicAppointmentAccess_tenantId_expiresAt_idx"
    ON "PublicAppointmentAccess"("tenantId", "expiresAt");
