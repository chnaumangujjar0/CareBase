import type { Request, Response } from "express";
import { z } from "zod";
import { db } from "../db/index.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getAuditRequestMetadata } from "../utils/audit.utils.js";
import { getTenantContext, parseParamUuid, parseRequest } from "../utils/request.utils.js";

const uuidSchema = z.uuid();
const medicineSchema = z.object({
  name: z.string().trim().min(1).max(200),
  genericName: z.string().trim().max(200).nullish(),
  form: z.string().trim().max(80).nullish(),
  strength: z.string().trim().max(80).nullish(),
  purchasePrice: z.number().finite().nonnegative().max(9_999_999_999.99).default(0),
  sellingPrice: z.number().finite().nonnegative().max(9_999_999_999.99).default(0),
});
const stockTransactionSchema = z.object({
  pharmacyId: uuidSchema,
  type: z.enum(["IN", "OUT"]),
  quantity: z.number().int().positive().max(1_000_000),
  reason: z.string().trim().max(1000).nullish(),
});

type MedicineTransaction = Parameters<Parameters<typeof db.$transaction>[0]>[0];

const writeAudit = (
  tx: MedicineTransaction,
  req: Request,
  action: string,
  entityType: string,
  entityId: string,
  newValue: Record<string, unknown>,
  oldValue?: Record<string, unknown>,
) => tx.auditLog.create({
  data: {
    action,
    entityType,
    entityId,
    tenantId: req.user!.tenantId,
    userId: req.user!.id,
    ...getAuditRequestMetadata(req),
    ...(oldValue ? { oldValue: oldValue as object } : {}),
    newValue: newValue as object,
  },
});

const withDbConflictHandling = async <T>(operation: Promise<T>): Promise<T> => {
  try {
    return await operation;
  } catch (error) {
    const record = typeof error === "object" && error !== null ? error as Record<string, unknown> : {};
    if (record.code === "P2002" || record.code === "P2003" || record.code === "P2034") {
      throw new ApiError(409, "The medicine stock changed or conflicts with an existing record.");
    }
    throw error;
  }
};

export const listMedicines = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId } = getTenantContext(req);
  const query = parseRequest(z.object({
    search: z.string().trim().max(100).optional(),
    includeInactive: z.preprocess((value) => value === true || value === "true", z.boolean()).default(false),
  }), req.query, "Invalid medicine query");
  const medicines = await db.medicine.findMany({
    where: {
      tenantId,
      ...(query.includeInactive ? {} : { isActive: true }),
      ...(query.search ? { OR: [
        { name: { contains: query.search, mode: "insensitive" } },
        { genericName: { contains: query.search, mode: "insensitive" } },
      ] } : {}),
    },
    orderBy: { name: "asc" },
    take: 100,
  });
  const stockTotals = medicines.length ? await db.stockTransaction.groupBy({
    by: ["medicineId", "type"],
    where: { tenantId, medicineId: { in: medicines.map(({ id }) => id) } },
    _sum: { quantity: true },
  }) : [];
  const stockCounts = new Map<string, number>();
  for (const total of stockTotals) {
    const quantity = total._sum.quantity ?? 0;
    stockCounts.set(total.medicineId, (stockCounts.get(total.medicineId) ?? 0) + (total.type === "IN" ? quantity : -quantity));
  }
  return res.status(200).json(new ApiResponse(200, medicines.map((medicine) => ({
    ...medicine,
    stockCount: stockCounts.get(medicine.id) ?? 0,
  })), "Medicines fetched successfully."));
});

export const createMedicine = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId } = getTenantContext(req);
  const input = parseRequest(medicineSchema, req.body, "Invalid medicine details");
  const medicine = await db.$transaction(async (tx) => {
    const created = await tx.medicine.create({ data: { ...input, tenantId } });
    await writeAudit(tx, req, "create", "Medicine", created.id, created);
    return created;
  });
  return res.status(201).json(new ApiResponse(201, medicine, "Medicine added successfully."));
});

export const updateMedicine = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId } = getTenantContext(req);
  const medicineId = parseParamUuid(req, "medicineId");
  const input = parseRequest(z.object({ isActive: z.boolean() }), req.body, "Invalid medicine details");
  const updated = await db.$transaction(async (tx) => {
    const current = await tx.medicine.findFirst({ where: { id: medicineId, tenantId } });
    if (!current) throw new ApiError(404, "Medicine not found.");
    await tx.medicine.updateMany({ where: { id: medicineId, tenantId }, data: input });
    const medicine = await tx.medicine.findFirst({ where: { id: medicineId, tenantId } });
    await writeAudit(tx, req, "update", "Medicine", medicineId, input, { isActive: current.isActive });
    return medicine;
  });
  return res.status(200).json(new ApiResponse(200, updated, "Medicine updated successfully."));
});

export const listMedicineStockTransactions = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId } = getTenantContext(req);
  const medicineId = parseParamUuid(req, "medicineId");
  const medicine = await db.medicine.findFirst({ where: { id: medicineId, tenantId }, select: { id: true } });
  if (!medicine) throw new ApiError(404, "Medicine not found.");
  const [transactions, totals] = await Promise.all([
    db.stockTransaction.findMany({
      where: { tenantId, medicineId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 100,
      include: { User: { select: { id: true, name: true } } },
    }),
    db.stockTransaction.groupBy({ by: ["type"], where: { tenantId, medicineId }, _sum: { quantity: true } }),
  ]);
  const balance = totals.reduce((count, total) => count + (total.type === "IN" ? total._sum.quantity ?? 0 : -(total._sum.quantity ?? 0)), 0);
  return res.status(200).json(new ApiResponse(200, { balance, transactions }, "Medicine stock history fetched successfully."));
});

export const createMedicineStockTransaction = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId, userId } = getTenantContext(req);
  const medicineId = parseParamUuid(req, "medicineId");
  const input = parseRequest(stockTransactionSchema, req.body, "Invalid stock transaction details");
  const result = await withDbConflictHandling(db.$transaction(async (tx) => {
    const medicine = await tx.medicine.findFirst({ where: { id: medicineId, tenantId }, select: { id: true } });
    if (!medicine) throw new ApiError(404, "Medicine not found.");
    const pharmacy = await tx.pharmacy.findFirst({ where: { id: input.pharmacyId, tenantId, isActive: true }, select: { id: true } });
    if (!pharmacy) throw new ApiError(404, "Active pharmacy not found.");
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${tenantId}:medicine-stock:${medicineId}`}, 0))`;
    const totals = await tx.stockTransaction.groupBy({ by: ["type"], where: { tenantId, medicineId }, _sum: { quantity: true } });
    const balance = totals.reduce((count, total) => count + (total.type === "IN" ? total._sum.quantity ?? 0 : -(total._sum.quantity ?? 0)), 0);
    if (input.type === "OUT" && input.quantity > balance) throw new ApiError(409, `Only ${balance} units are currently in stock.`);
    const transaction = await tx.stockTransaction.create({
      data: { ...input, reason: input.reason ?? null, tenantId, medicineId, recordedBy: userId },
      include: { User: { select: { id: true, name: true } } },
    });
    await writeAudit(tx, req, "create", "StockTransaction", transaction.id, { type: input.type, quantity: input.quantity, medicineId });
    return { balance: balance + (input.type === "IN" ? input.quantity : -input.quantity), transaction };
  }, { isolationLevel: "Serializable" }));
  return res.status(201).json(new ApiResponse(201, result, "Medicine stock transaction recorded successfully."));
});
