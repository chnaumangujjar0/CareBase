-- CreateTable
CREATE TABLE "BillingRate" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "appointmentType" TEXT,
    "procedureCode" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" UUID NOT NULL,
    "doctorId" UUID,
    "bedId" UUID,

    CONSTRAINT "BillingRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingInvoice" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "taxAmount" DECIMAL(12,2) NOT NULL,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balanceAmount" DECIMAL(12,2) NOT NULL,
    "issuedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMPTZ(6),
    "notes" TEXT,
    "tenantId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "appointmentId" UUID,
    "admissionId" UUID,
    "createdBy" UUID NOT NULL,

    CONSTRAINT "BillingInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingInvoiceItem" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "taxAmount" DECIMAL(12,2) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "tenantId" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "saleId" UUID,

    CONSTRAINT "BillingInvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingPayment" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "reference" TEXT,
    "notes" TEXT,
    "tenantId" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "collectedBy" UUID NOT NULL,

    CONSTRAINT "BillingPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BillingRate_tenantId_category_isActive_idx" ON "BillingRate"("tenantId", "category", "isActive");

-- CreateIndex
CREATE INDEX "BillingRate_tenantId_doctorId_appointmentType_idx" ON "BillingRate"("tenantId", "doctorId", "appointmentType");

-- CreateIndex
CREATE INDEX "BillingRate_tenantId_procedureCode_idx" ON "BillingRate"("tenantId", "procedureCode");

-- CreateIndex
CREATE UNIQUE INDEX "BillingRate_tenantId_code_key" ON "BillingRate"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "BillingRate_bedId_tenantId_key" ON "BillingRate"("bedId", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingInvoice_appointmentId_key" ON "BillingInvoice"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingInvoice_admissionId_key" ON "BillingInvoice"("admissionId");

-- CreateIndex
CREATE INDEX "BillingInvoice_tenantId_patientId_createdAt_idx" ON "BillingInvoice"("tenantId", "patientId", "createdAt");

-- CreateIndex
CREATE INDEX "BillingInvoice_tenantId_status_dueAt_idx" ON "BillingInvoice"("tenantId", "status", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "BillingInvoice_tenantId_invoiceNumber_key" ON "BillingInvoice"("tenantId", "invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "BillingInvoice_id_tenantId_key" ON "BillingInvoice"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingInvoice_appointmentId_tenantId_key" ON "BillingInvoice"("appointmentId", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingInvoice_admissionId_tenantId_key" ON "BillingInvoice"("admissionId", "tenantId");

-- CreateIndex
CREATE INDEX "BillingInvoiceItem_invoiceId_idx" ON "BillingInvoiceItem"("invoiceId");

-- CreateIndex
CREATE INDEX "BillingInvoiceItem_tenantId_category_idx" ON "BillingInvoiceItem"("tenantId", "category");

-- CreateIndex
CREATE INDEX "BillingInvoiceItem_saleId_idx" ON "BillingInvoiceItem"("saleId");

-- CreateIndex
CREATE INDEX "BillingPayment_tenantId_createdAt_idx" ON "BillingPayment"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "BillingPayment_invoiceId_createdAt_idx" ON "BillingPayment"("invoiceId", "createdAt");

-- AddForeignKey
ALTER TABLE "BillingRate" ADD CONSTRAINT "BillingRate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "BillingRate" ADD CONSTRAINT "BillingRate_doctorId_tenantId_fkey" FOREIGN KEY ("doctorId", "tenantId") REFERENCES "DoctorProfile"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "BillingRate" ADD CONSTRAINT "BillingRate_bedId_tenantId_fkey" FOREIGN KEY ("bedId", "tenantId") REFERENCES "Bed"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "BillingInvoice" ADD CONSTRAINT "BillingInvoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "BillingInvoice" ADD CONSTRAINT "BillingInvoice_patientId_tenantId_fkey" FOREIGN KEY ("patientId", "tenantId") REFERENCES "Patient"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "BillingInvoice" ADD CONSTRAINT "BillingInvoice_appointmentId_tenantId_fkey" FOREIGN KEY ("appointmentId", "tenantId") REFERENCES "Appointment"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "BillingInvoice" ADD CONSTRAINT "BillingInvoice_admissionId_tenantId_fkey" FOREIGN KEY ("admissionId", "tenantId") REFERENCES "Admission"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "BillingInvoice" ADD CONSTRAINT "BillingInvoice_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "BillingInvoiceItem" ADD CONSTRAINT "BillingInvoiceItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "BillingInvoiceItem" ADD CONSTRAINT "BillingInvoiceItem_invoiceId_tenantId_fkey" FOREIGN KEY ("invoiceId", "tenantId") REFERENCES "BillingInvoice"("id", "tenantId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "BillingInvoiceItem" ADD CONSTRAINT "BillingInvoiceItem_saleId_tenantId_fkey" FOREIGN KEY ("saleId", "tenantId") REFERENCES "Sale"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "BillingPayment" ADD CONSTRAINT "BillingPayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "BillingPayment" ADD CONSTRAINT "BillingPayment_invoiceId_tenantId_fkey" FOREIGN KEY ("invoiceId", "tenantId") REFERENCES "BillingInvoice"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "BillingPayment" ADD CONSTRAINT "BillingPayment_collectedBy_fkey" FOREIGN KEY ("collectedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
