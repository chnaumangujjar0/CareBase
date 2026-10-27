import type { db } from "../db/index.js";

type TransactionClient = Parameters<Parameters<typeof db.$transaction>[0]>[0];

export async function nextTenantCounter(
  tx: TransactionClient,
  tenantId: string,
  kind: string,
): Promise<number> {
  await tx.$executeRaw`
    INSERT INTO "TenantCounter" ("id", "tenantId", "kind", "nextValue")
    VALUES (gen_random_uuid(), ${tenantId}::uuid, ${kind}, 2)
    ON CONFLICT ("tenantId", "kind") DO NOTHING
  `;

  const rows = await tx.$queryRaw<Array<{ nextValue: number }>>`
    SELECT "nextValue"
    FROM "TenantCounter"
    WHERE "tenantId" = ${tenantId}::uuid AND "kind" = ${kind}
    FOR UPDATE
  `;
  const current = rows[0]?.nextValue;
  if (!current) throw new Error(`Tenant counter "${kind}" was not initialized.`);

  await tx.$executeRaw`
    UPDATE "TenantCounter"
    SET "nextValue" = ${current + 1}, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "tenantId" = ${tenantId}::uuid AND "kind" = ${kind}
  `;
  return current;
}
