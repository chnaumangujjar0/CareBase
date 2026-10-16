/*
  Warnings:

  - A unique constraint covering the columns `[saleId]` on the table `BillingInvoiceItem` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "billingMode" TEXT NOT NULL DEFAULT 'immediate';

-- CreateIndex
CREATE UNIQUE INDEX "BillingInvoiceItem_saleId_key" ON "BillingInvoiceItem"("saleId");
