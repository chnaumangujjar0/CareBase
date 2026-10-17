CREATE UNIQUE INDEX "Pharmacy_one_central_store_per_tenant"
ON "Pharmacy" ("tenantId")
WHERE "type" = 'central_store';
