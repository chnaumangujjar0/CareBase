/*
  Warnings:

  - A unique constraint covering the columns `[pharmacistUserId]` on the table `Pharmacy` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Medicine" ADD COLUMN     "purchasePrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "sellingPrice" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Pharmacy" ADD COLUMN     "pharmacistUserId" UUID;

-- AlterTable
ALTER TABLE "StockRequest" ADD COLUMN     "receiptNote" TEXT;

-- AlterTable
ALTER TABLE "StockRequestItem" ADD COLUMN     "receivedQuantity" INTEGER;

-- CreateTable
CREATE TABLE "Sale" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "paymentMethod" TEXT NOT NULL DEFAULT 'cash',
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "tenantId" UUID NOT NULL,
    "pharmacyId" UUID NOT NULL,
    "soldBy" UUID NOT NULL,
    "patientId" UUID,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPurchasePrice" DECIMAL(12,2) NOT NULL,
    "unitSellingPrice" DECIMAL(12,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,
    "tenantId" UUID NOT NULL,
    "saleId" UUID NOT NULL,
    "medicineId" UUID NOT NULL,

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Sale_tenantId_createdAt_idx" ON "Sale"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Sale_pharmacyId_createdAt_idx" ON "Sale"("pharmacyId", "createdAt");

-- CreateIndex
CREATE INDEX "Sale_soldBy_createdAt_idx" ON "Sale"("soldBy", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_id_tenantId_key" ON "Sale"("id", "tenantId");

-- CreateIndex
CREATE INDEX "SaleItem_saleId_idx" ON "SaleItem"("saleId");

-- CreateIndex
CREATE INDEX "SaleItem_medicineId_tenantId_idx" ON "SaleItem"("medicineId", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Pharmacy_pharmacistUserId_key" ON "Pharmacy"("pharmacistUserId");

-- CreateIndex
CREATE INDEX "Pharmacy_tenantId_type_isActive_idx" ON "Pharmacy"("tenantId", "type", "isActive");

-- AddForeignKey
ALTER TABLE "Pharmacy" ADD CONSTRAINT "Pharmacy_pharmacistUserId_fkey" FOREIGN KEY ("pharmacistUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_pharmacyId_tenantId_fkey" FOREIGN KEY ("pharmacyId", "tenantId") REFERENCES "Pharmacy"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_soldBy_fkey" FOREIGN KEY ("soldBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_patientId_tenantId_fkey" FOREIGN KEY ("patientId", "tenantId") REFERENCES "Patient"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_tenantId_fkey" FOREIGN KEY ("saleId", "tenantId") REFERENCES "Sale"("id", "tenantId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_medicineId_tenantId_fkey" FOREIGN KEY ("medicineId", "tenantId") REFERENCES "Medicine"("id", "tenantId") ON DELETE RESTRICT ON UPDATE NO ACTION;
