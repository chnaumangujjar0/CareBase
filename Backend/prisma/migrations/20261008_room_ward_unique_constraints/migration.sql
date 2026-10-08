CREATE UNIQUE INDEX "Room_wardId_name_key"
    ON public."Room"("wardId", "name");

CREATE UNIQUE INDEX "Ward_tenantId_name_key"
    ON public."Ward"("tenantId", "name");
