import type { Request, Response } from "express";
import { z } from "zod";
import { db } from "../db/index.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getAuditRequestMetadata } from "../utils/audit.utils.js";
import { getTenantContext, parseParamUuid, parseRequest } from "../utils/request.utils.js";

const uuidSchema = z.uuid();
const pharmacyTypeSchema = z.enum(["central_store", "sub_store"]);
const stockTypeSchema = z.enum(["IN", "OUT"]);
const requestStatusSchema = z.enum(["pending", "approved", "rejected", "dispatched", "received", "partially_received", "not_received"]);

const roleName = (req: Request) => req.role?.name?.toLowerCase() ?? "";
const isHeadPharmacist = (req: Request) => ["owner", "admin", "head pharmacist", "head_pharmacist"].includes(roleName(req));

const pharmacySelect = {
  id: true,
  createdAt: true,
  name: true,
  type: true,
  isActive: true,
} as const;

const stockInclude = {
  Medicine: { select: { id: true, name: true, genericName: true, form: true, strength: true, isActive: true } },
} as const;

const requestInclude = {
  RequestingPharmacy: { select: pharmacySelect },
  FulfillingPharmacy: { select: pharmacySelect },
  Requester: { select: { id: true, name: true } },
  Handler: { select: { id: true, name: true } },
  Receiver: { select: { id: true, name: true } },
  Items: { include: { Medicine: { select: { id: true, name: true, genericName: true, form: true, strength: true } } } },
} as const;

const writeAudit = (req: Request, action: string, entityType: string, entityId: string, newValue: Record<string, unknown>) =>
  db.auditLog.create({
    data: {
      action,
      entityType,
      entityId,
      tenantId: req.user!.tenantId,
      userId: req.user!.id,
      ...getAuditRequestMetadata(req),
      newValue: newValue as object,
    },
  });

const pharmacySchema = z.object({
  name: z.string().trim().min(2).max(160),
  type: pharmacyTypeSchema.default("sub_store"),
});

export const listPharmacies = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId, userId } = getTenantContext(req);
  const pharmacies = await db.pharmacy.findMany({
    where: { tenantId, ...(isHeadPharmacist(req) ? {} : { OR: [{ type: "central_store" }, { pharmacistUserId: userId }] }) },
    orderBy: [{ type: "asc" }, { name: "asc" }],
    include: { Pharmacist: { select: { id: true, name: true, email: true } }, Stocks: { include: stockInclude, orderBy: { Medicine: { name: "asc" } } } },
  });
  const data = pharmacies.map((pharmacy) => ({
    ...pharmacy,
    stockCount: pharmacy.Stocks.reduce((total, stock) => total + stock.currentStock, 0),
    lowStockCount: pharmacy.Stocks.filter((stock) => stock.currentStock <= stock.reorderLevel).length,
  }));
  return res.status(200).json(new ApiResponse(200, data, "Pharmacies fetched successfully."));
});

export const createPharmacy = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId } = getTenantContext(req);
  if (!isHeadPharmacist(req)) throw new ApiError(403, "Only a head pharmacist can create pharmacy locations.");
  const input = parseRequest(pharmacySchema, req.body);
  const pharmacy = await db.pharmacy.create({ data: { ...input, tenantId }, select: pharmacySelect });
  await writeAudit(req, "create", "Pharmacy", pharmacy.id, { name: pharmacy.name, type: pharmacy.type });
  return res.status(201).json(new ApiResponse(201, pharmacy, "Pharmacy created successfully."));
});

export const updatePharmacy = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId } = getTenantContext(req);
  if (!isHeadPharmacist(req)) throw new ApiError(403, "Only a head pharmacist can update pharmacy locations.");
  const pharmacyId = parseParamUuid(req, "pharmacyId");
  const input = parseRequest(z.object({ name: z.string().trim().min(2).max(160).optional(), type: pharmacyTypeSchema.optional(), isActive: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0), req.body);
  const current = await db.pharmacy.findFirst({ where: { id: pharmacyId, tenantId }, select: pharmacySelect });
  if (!current) throw new ApiError(404, "Pharmacy not found.");
  const pharmacy = await db.pharmacy.update({ where: { id: pharmacyId }, data: input, select: pharmacySelect });
  await writeAudit(req, "update", "Pharmacy", pharmacy.id, input);
  return res.status(200).json(new ApiResponse(200, pharmacy, "Pharmacy updated successfully."));
});

export const listPharmacyStock = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId } = getTenantContext(req);
  const pharmacyId = parseParamUuid(req, "pharmacyId");
  const pharmacy = await db.pharmacy.findFirst({ where: { id: pharmacyId, tenantId }, select: pharmacySelect });
  if (!pharmacy) throw new ApiError(404, "Pharmacy not found.");
  const stocks = await db.pharmacyStock.findMany({ where: { pharmacyId, tenantId }, include: stockInclude, orderBy: { Medicine: { name: "asc" } } });
  return res.status(200).json(new ApiResponse(200, stocks, "Pharmacy stock fetched successfully."));
});

const stockSchema = z.object({
  medicineId: uuidSchema,
  type: stockTypeSchema,
  quantity: z.number().int().positive().max(1_000_000),
  reason: z.string().trim().max(1000).nullish(),
  reorderLevel: z.number().int().nonnegative().max(1_000_000).optional(),
});

export const createPharmacyStockTransaction = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId, userId } = getTenantContext(req);
  const pharmacyId = parseParamUuid(req, "pharmacyId");
  const input = parseRequest(stockSchema, req.body);
  if (!isHeadPharmacist(req)) throw new ApiError(403, "Only a head pharmacist can add or dispense warehouse stock.");
  const result = await db.$transaction(async (tx) => {
    const [pharmacy, medicine] = await Promise.all([
      tx.pharmacy.findFirst({ where: { id: pharmacyId, tenantId, isActive: true }, select: { id: true, type: true } }),
      tx.medicine.findFirst({ where: { id: input.medicineId, tenantId, isActive: true }, select: { id: true } }),
    ]);
    if (!pharmacy) throw new ApiError(404, "Active pharmacy not found.");
    if (pharmacy.type !== "central_store") throw new ApiError(403, "Warehouse stock can only be added through the main warehouse.");
    if (!medicine) throw new ApiError(404, "Active medicine not found.");
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${tenantId}:pharmacy-stock:${pharmacyId}:${input.medicineId}`}, 0))`;
    const current = await tx.pharmacyStock.findUnique({ where: { pharmacyId_medicineId_tenantId: { pharmacyId, medicineId: input.medicineId, tenantId } } });
    const balance = current?.currentStock ?? 0;
    if (input.type === "OUT" && input.quantity > balance) throw new ApiError(409, `Only ${balance} units are currently in stock.`);
    const nextBalance = balance + (input.type === "IN" ? input.quantity : -input.quantity);
    const stock = await tx.pharmacyStock.upsert({
      where: { pharmacyId_medicineId_tenantId: { pharmacyId, medicineId: input.medicineId, tenantId } },
      create: { pharmacyId, medicineId: input.medicineId, tenantId, currentStock: nextBalance, reorderLevel: input.reorderLevel ?? 10 },
      update: { currentStock: nextBalance, ...(input.reorderLevel === undefined ? {} : { reorderLevel: input.reorderLevel }) },
      include: stockInclude,
    });
    const transaction = await tx.stockTransaction.create({
      data: { pharmacyId, medicineId: input.medicineId, tenantId, type: input.type, quantity: input.quantity, reason: input.reason ?? null, recordedBy: userId },
      include: { User: { select: { id: true, name: true } }, Medicine: { select: { id: true, name: true } } },
    });
    return { balance: nextBalance, stock, transaction };
  }, { isolationLevel: "Serializable" });
  await writeAudit(req, "create", "StockTransaction", result.transaction.id, { pharmacyId, medicineId: input.medicineId, type: input.type, quantity: input.quantity });
  return res.status(201).json(new ApiResponse(201, result, "Pharmacy stock transaction recorded successfully."));
});

export const listPharmacyStockTransactions = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId } = getTenantContext(req);
  const pharmacyId = parseParamUuid(req, "pharmacyId");
  const medicineId = req.query.medicineId ? uuidSchema.parse(req.query.medicineId) : undefined;
  const transactions = await db.stockTransaction.findMany({
    where: { tenantId, pharmacyId, ...(medicineId ? { medicineId } : {}) },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 200,
    include: { User: { select: { id: true, name: true } }, Medicine: { select: { id: true, name: true } } },
  });
  return res.status(200).json(new ApiResponse(200, transactions, "Pharmacy stock transactions fetched successfully."));
});

const requestSchema = z.object({
  requestingPharmacyId: uuidSchema,
  fulfillingPharmacyId: uuidSchema,
  notes: z.string().trim().max(2000).nullish(),
  items: z.array(z.object({ medicineId: uuidSchema, requestedQuantity: z.number().int().positive().max(1_000_000) })).min(1).max(100),
});

export const listStockRequests = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId, userId } = getTenantContext(req);
  const status = req.query.status ? requestStatusSchema.parse(req.query.status) : undefined;
  const requests = await db.stockRequest.findMany({ where: { tenantId, ...(status ? { status } : {}), ...(isHeadPharmacist(req) ? {} : { OR: [{ RequestingPharmacy: { pharmacistUserId: userId } }, { FulfillingPharmacy: { pharmacistUserId: userId } }] }) }, orderBy: { createdAt: "desc" }, take: 200, include: requestInclude });
  return res.status(200).json(new ApiResponse(200, requests, "Stock requests fetched successfully."));
});

export const createStockRequest = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId, userId } = getTenantContext(req);
  const input = parseRequest(requestSchema, req.body);
  if (input.requestingPharmacyId === input.fulfillingPharmacyId) throw new ApiError(400, "Requesting and fulfilling pharmacies must be different.");
  const request = await db.$transaction(async (tx) => {
    const [requestingPharmacy, fulfillingPharmacy, medicines] = await Promise.all([
      tx.pharmacy.findFirst({ where: { id: input.requestingPharmacyId, tenantId, isActive: true }, select: { id: true } }),
      tx.pharmacy.findFirst({ where: { id: input.fulfillingPharmacyId, tenantId, isActive: true }, select: { id: true } }),
      tx.medicine.findMany({ where: { tenantId, isActive: true, id: { in: input.items.map((item) => item.medicineId) } }, select: { id: true } }),
    ]);
    if (!requestingPharmacy || !fulfillingPharmacy) throw new ApiError(404, "Both pharmacies must be active locations in this hospital.");
    if (!isHeadPharmacist(req) && (await tx.pharmacy.findFirst({ where: { id: input.requestingPharmacyId, tenantId, pharmacistUserId: userId }, select: { id: true } })) === null) {
      throw new ApiError(403, "Only the assigned sub-pharmacist can request stock for this pharmacy.");
    }
    if (medicines.length !== new Set(input.items.map((item) => item.medicineId)).size) throw new ApiError(404, "One or more requested medicines are not active.");
    return tx.stockRequest.create({ data: { tenantId, requestingPharmacyId: input.requestingPharmacyId, fulfillingPharmacyId: input.fulfillingPharmacyId, requestedBy: userId, notes: input.notes ?? null, Items: { create: input.items.map((item) => ({ tenantId, medicineId: item.medicineId, requestedQuantity: item.requestedQuantity })) } }, include: requestInclude });
  });
  await writeAudit(req, "create", "StockRequest", request.id, { requestingPharmacyId: input.requestingPharmacyId, fulfillingPharmacyId: input.fulfillingPharmacyId, itemCount: input.items.length });
  return res.status(201).json(new ApiResponse(201, request, "Stock request created successfully."));
});

const requestStatusBodySchema = z.object({
  status: requestStatusSchema,
  notes: z.string().trim().max(2000).nullish(),
  receiptNote: z.string().trim().max(2000).nullish(),
  items: z.array(z.object({ medicineId: uuidSchema, approvedQuantity: z.number().int().positive().max(1_000_000).optional(), receivedQuantity: z.number().int().nonnegative().max(1_000_000).optional() })).optional(),
});

export const updateStockRequestStatus = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId, userId } = getTenantContext(req);
  const requestId = parseParamUuid(req, "requestId");
  const input = parseRequest(requestStatusBodySchema, req.body);
  const result = await db.$transaction(async (tx) => {
    const request = await tx.stockRequest.findFirst({ where: { id: requestId, tenantId }, include: { Items: true } });
    if (!request) throw new ApiError(404, "Stock request not found.");
    const allowed: Record<string, string[]> = { pending: ["approved", "rejected"], approved: ["dispatched"], dispatched: ["received", "partially_received", "not_received"] };
    if (!allowed[request.status]?.includes(input.status)) throw new ApiError(409, `Cannot change a ${request.status} request to ${input.status}.`);
    const isRequester = (await tx.pharmacy.findFirst({ where: { id: request.requestingPharmacyId, tenantId, pharmacistUserId: userId }, select: { id: true } })) !== null;
    const isFulfiller = (await tx.pharmacy.findFirst({ where: { id: request.fulfillingPharmacyId, tenantId, pharmacistUserId: userId }, select: { id: true } })) !== null;
    if (["approved", "rejected", "dispatched"].includes(input.status) && !isHeadPharmacist(req) && !isFulfiller) throw new ApiError(403, "Only the assigned head pharmacist can process this request.");
    if (["received", "partially_received", "not_received"].includes(input.status) && !isRequester) throw new ApiError(403, "Only the requesting sub-pharmacist can confirm this delivery.");
    if (input.status === "approved") {
      const quantities = new Map((input.items ?? []).filter((item) => item.approvedQuantity !== undefined).map((item) => [item.medicineId, item.approvedQuantity!]));
      for (const item of request.Items) {
        const quantity = quantities.get(item.medicineId) ?? item.requestedQuantity;
        await tx.stockRequestItem.update({ where: { id: item.id }, data: { approvedQuantity: quantity } });
      }
    }
    if (input.status === "dispatched") {
      for (const item of request.Items) {
        const quantity = item.approvedQuantity ?? item.requestedQuantity;
        const stock = await tx.pharmacyStock.findUnique({ where: { pharmacyId_medicineId_tenantId: { pharmacyId: request.fulfillingPharmacyId, medicineId: item.medicineId, tenantId } } });
        if (!stock || stock.currentStock < quantity) throw new ApiError(409, "The fulfilling pharmacy does not have enough stock for this request.");
        await tx.pharmacyStock.update({ where: { id: stock.id }, data: { currentStock: { decrement: quantity } } });
        await tx.stockTransaction.create({ data: { pharmacyId: request.fulfillingPharmacyId, medicineId: item.medicineId, tenantId, type: "OUT", quantity, reason: `Stock request ${request.id}`, recordedBy: userId } });
      }
    }
    if (["received", "partially_received", "not_received"].includes(input.status)) {
      if (!input.items?.length && input.status !== "not_received") throw new ApiError(400, "Received quantities are required.");
      const receivedQuantities = new Map((input.items ?? []).map((item) => [item.medicineId, item.receivedQuantity ?? 0]));
      for (const item of request.Items) {
        const quantity = receivedQuantities.get(item.medicineId) ?? 0;
        const approved = item.approvedQuantity ?? item.requestedQuantity;
        if (quantity > approved) throw new ApiError(400, "Received quantity cannot exceed approved quantity.");
        await tx.stockRequestItem.update({ where: { id: item.id }, data: { receivedQuantity: quantity } });
        if (quantity > 0) {
          await tx.pharmacyStock.upsert({ where: { pharmacyId_medicineId_tenantId: { pharmacyId: request.requestingPharmacyId, medicineId: item.medicineId, tenantId } }, create: { pharmacyId: request.requestingPharmacyId, medicineId: item.medicineId, tenantId, currentStock: quantity }, update: { currentStock: { increment: quantity } } });
          await tx.stockTransaction.create({ data: { pharmacyId: request.requestingPharmacyId, medicineId: item.medicineId, tenantId, type: "IN", quantity, reason: `Stock request ${request.id}`, recordedBy: userId } });
        }
      }
    }
    return tx.stockRequest.update({ where: { id: requestId }, data: { status: input.status, ...(input.notes !== undefined ? { notes: input.notes } : {}), ...(input.receiptNote !== undefined ? { receiptNote: input.receiptNote } : {}), ...(input.status === "approved" || input.status === "rejected" || input.status === "dispatched" ? { handledBy: userId } : {}), ...(input.status === "dispatched" ? { dispatchedAt: new Date() } : {}), ...(input.status === "received" || input.status === "partially_received" || input.status === "not_received" ? { receivedBy: userId, receivedAt: new Date() } : {}) }, include: requestInclude });
  }, { isolationLevel: "Serializable" });
  await writeAudit(req, "update", "StockRequest", requestId, { status: input.status });
  return res.status(200).json(new ApiResponse(200, result, "Stock request updated successfully."));
});

const pharmacistAssignmentSchema = z.object({ pharmacistUserId: uuidSchema.nullish() });

export const assignPharmacist = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId } = getTenantContext(req);
  if (!isHeadPharmacist(req)) throw new ApiError(403, "Only a head pharmacist can assign pharmacists.");
  const pharmacyId = parseParamUuid(req, "pharmacyId");
  const input = parseRequest(pharmacistAssignmentSchema, req.body);
  const pharmacy = await db.pharmacy.findFirst({ where: { id: pharmacyId, tenantId }, select: pharmacySelect });
  if (!pharmacy) throw new ApiError(404, "Pharmacy not found.");
  if (input.pharmacistUserId) {
    const pharmacist = await db.user.findFirst({
      where: { id: input.pharmacistUserId, tenantId, isActive: true },
      include: { Role: { select: { name: true } }, ManagedPharmacy: { select: { id: true } } },
    });
    if (!pharmacist || !pharmacist.Role?.name.toLowerCase().includes("pharmacist")) {
      throw new ApiError(400, "The selected active user must have a pharmacist role.");
    }
    if (pharmacist.ManagedPharmacy && pharmacist.ManagedPharmacy.id !== pharmacyId) {
      throw new ApiError(409, "This pharmacist is already assigned to another pharmacy.");
    }
  }
  const updated = await db.pharmacy.update({ where: { id: pharmacyId }, data: { pharmacistUserId: input.pharmacistUserId ?? null }, include: { Pharmacist: { select: { id: true, name: true, email: true } } } });
  await writeAudit(req, "update", "Pharmacy", pharmacyId, { pharmacistUserId: input.pharmacistUserId ?? null });
  return res.status(200).json(new ApiResponse(200, updated, "Pharmacist assignment updated successfully."));
});

const saleSchema = z.object({
  customerName: z.string().trim().min(1).max(160),
  customerPhone: z.string().trim().max(40).nullish(),
  patientId: uuidSchema.nullish(),
  paymentMethod: z.enum(["cash", "card", "insurance"]).default("cash"),
  items: z.array(z.object({ medicineId: uuidSchema, quantity: z.number().int().positive().max(100000) })).min(1).max(100),
});

export const createSale = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId, userId } = getTenantContext(req);
  const pharmacyId = parseParamUuid(req, "pharmacyId");
  const input = parseRequest(saleSchema, req.body);
  const result = await db.$transaction(async (tx) => {
    const pharmacy = await tx.pharmacy.findFirst({ where: { id: pharmacyId, tenantId, type: "sub_store", isActive: true }, select: { id: true, pharmacistUserId: true } });
    if (!pharmacy) throw new ApiError(404, "Active sub-pharmacy not found.");
    if (pharmacy.pharmacistUserId !== userId) throw new ApiError(403, "Only the assigned sub-pharmacist can sell from this pharmacy.");
    if (input.patientId) {
      const patient = await tx.patient.findFirst({ where: { id: input.patientId, tenantId, isActive: true, deletedAt: null }, select: { id: true } });
      if (!patient) throw new ApiError(404, "Active patient not found.");
    }
    const uniqueMedicineIds = [...new Set(input.items.map((item) => item.medicineId))];
    const medicines = await tx.medicine.findMany({ where: { tenantId, isActive: true, id: { in: uniqueMedicineIds } } });
    if (medicines.length !== uniqueMedicineIds.length) throw new ApiError(404, "One or more medicines are not active.");
    const medicineMap = new Map(medicines.map((medicine) => [medicine.id, medicine]));
    let total = 0;
    const items: Array<{ medicineId: string; quantity: number; unitPurchasePrice: string; unitSellingPrice: string; lineTotal: string }> = [];
    for (const item of input.items) {
      const medicine = medicineMap.get(item.medicineId)!;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${tenantId}:pharmacy-stock:${pharmacyId}:${item.medicineId}`}, 0))`;
      const stock = await tx.pharmacyStock.findUnique({ where: { pharmacyId_medicineId_tenantId: { pharmacyId, medicineId: item.medicineId, tenantId } } });
      if (!stock || stock.currentStock < item.quantity) throw new ApiError(409, `${medicine.name} has only ${stock?.currentStock ?? 0} units available.`);
      if (Number(medicine.sellingPrice) <= 0) throw new ApiError(409, `${medicine.name} does not have a selling price configured.`);
      const lineTotal = Number(medicine.sellingPrice) * item.quantity;
      total += lineTotal;
      await tx.pharmacyStock.update({ where: { id: stock.id }, data: { currentStock: { decrement: item.quantity } } });
      await tx.stockTransaction.create({ data: { pharmacyId, medicineId: item.medicineId, tenantId, type: "OUT", quantity: item.quantity, reason: "Customer sale", recordedBy: userId } });
      items.push({ medicineId: item.medicineId, quantity: item.quantity, unitPurchasePrice: medicine.purchasePrice.toString(), unitSellingPrice: medicine.sellingPrice.toString(), lineTotal: lineTotal.toFixed(2) });
    }
    return tx.sale.create({ data: { tenantId, pharmacyId, soldBy: userId, customerName: input.customerName, customerPhone: input.customerPhone ?? null, patientId: input.patientId ?? null, paymentMethod: input.paymentMethod, totalAmount: total.toFixed(2), Items: { create: items } }, include: { Items: { include: { Medicine: { select: { id: true, name: true, strength: true } } } }, Pharmacy: { select: { id: true, name: true } } } });
  }, { isolationLevel: "Serializable" });
  await writeAudit(req, "create", "Sale", result.id, { pharmacyId, customerName: input.customerName, totalAmount: result.totalAmount.toString() });
  return res.status(201).json(new ApiResponse(201, result, "Medicine sale recorded successfully."));
});

export const getPharmacyDashboard = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId } = getTenantContext(req);
  if (!isHeadPharmacist(req)) throw new ApiError(403, "Only a head pharmacist can view the pharmacy dashboard.");
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const [sales, lowStock, pharmacies] = await Promise.all([
    db.sale.findMany({ where: { tenantId, createdAt: { gte: since } }, select: { createdAt: true, totalAmount: true, pharmacyId: true, Pharmacy: { select: { name: true } } }, orderBy: { createdAt: "asc" } }),
    db.pharmacyStock.findMany({ where: { tenantId, currentStock: { lte: 10 } }, include: { Pharmacy: { select: { id: true, name: true } }, Medicine: { select: { id: true, name: true } } }, orderBy: { currentStock: "asc" }, take: 100 }),
    db.pharmacy.findMany({ where: { tenantId }, select: { id: true, name: true, type: true, isActive: true, pharmacistUserId: true } }),
  ]);
  const byDay = new Map<string, { date: string; sales: number; transactions: number }>();
  for (const sale of sales) {
    const date = sale.createdAt.toISOString().slice(0, 10);
    const row = byDay.get(date) ?? { date, sales: 0, transactions: 0 };
    row.sales += Number(sale.totalAmount);
    row.transactions += 1;
    byDay.set(date, row);
  }
  return res.status(200).json(new ApiResponse(200, { salesByDay: [...byDay.values()], lowStock, pharmacies, totals: { sales: sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0), transactions: sales.length, lowStock: lowStock.length } }, "Pharmacy dashboard fetched successfully."));
});
