import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "../db/index.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getAuditRequestMetadata } from "../utils/audit.utils.js";
import { getTenantContext, parseParamUuid, parseRequest } from "../utils/request.utils.js";

const uuidSchema = z.uuid();
const categories = z.enum(["appointment", "bed", "surgery", "consultation", "hospital_fee"]);
const invoiceStatuses = z.enum(["draft", "open", "partially_paid", "paid", "void", "overdue"]);
const paymentMethods = z.enum(["cash", "card"]);

type Transaction = Parameters<Parameters<typeof db.$transaction>[0]>[0];

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const amountString = (value: number) => roundMoney(value).toFixed(2);
const invoiceNumber = () => `INV-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;

const invoiceInclude = {
  Patient: { select: { id: true, mrn: true, firstName: true, lastName: true, contactPhone: true } },
  Appointment: { select: { id: true, scheduledAt: true, status: true } },
  Admission: { select: { id: true, admittedAt: true, status: true } },
  Items: { orderBy: { createdAt: "asc" as const } },
  Payments: { orderBy: { createdAt: "desc" as const }, include: { Collector: { select: { id: true, name: true } } } },
} as const;

const writeAudit = (req: Request, action: string, entityType: string, entityId: string, newValue: Record<string, unknown>) =>
  db.auditLog.create({ data: { action, entityType, entityId, tenantId: req.user!.tenantId, userId: req.user!.id, ...getAuditRequestMetadata(req), newValue: newValue as object } });

const recalculateInvoice = async (tx: Transaction, invoiceId: string, tenantId: string) => {
  const invoice = await tx.billingInvoice.findFirst({ where: { id: invoiceId, tenantId }, include: { Items: true, Payments: { where: { status: "completed" } } } });
  if (!invoice) throw new ApiError(404, "Invoice not found.");
  const subtotal = invoice.Items.reduce((sum, item) => sum + Number(item.subtotal), 0);
  const taxAmount = invoice.Items.reduce((sum, item) => sum + Number(item.taxAmount), 0);
  const totalAmount = roundMoney(subtotal + taxAmount - Number(invoice.discountAmount));
  const paidAmount = invoice.Payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const balanceAmount = roundMoney(Math.max(0, totalAmount - paidAmount));
  const status = invoice.status === "void" ? "void" : balanceAmount === 0 && totalAmount > 0 ? "paid" : paidAmount > 0 ? "partially_paid" : "open";
  return tx.billingInvoice.update({ where: { id: invoiceId }, data: { subtotal: amountString(subtotal), taxAmount: amountString(taxAmount), totalAmount: amountString(totalAmount), paidAmount: amountString(paidAmount), balanceAmount: amountString(balanceAmount), status }, include: invoiceInclude });
};

const serializeInvoice = (invoice: any) => ({
  ...invoice,
  subtotal: Number(invoice.subtotal),
  taxAmount: Number(invoice.taxAmount),
  discountAmount: Number(invoice.discountAmount),
  totalAmount: Number(invoice.totalAmount),
  paidAmount: Number(invoice.paidAmount),
  balanceAmount: Number(invoice.balanceAmount),
  Items: invoice.Items?.map((item: any) => ({ ...item, quantity: Number(item.quantity), unitPrice: Number(item.unitPrice), taxRate: Number(item.taxRate), subtotal: Number(item.subtotal), taxAmount: Number(item.taxAmount), totalAmount: Number(item.totalAmount) })),
  Payments: invoice.Payments?.map((payment: any) => ({ ...payment, amount: Number(payment.amount) })),
});

const rateSchema = z.object({
  code: z.string().trim().min(2).max(80),
  name: z.string().trim().min(2).max(160),
  category: categories,
  appointmentType: z.string().trim().max(80).nullish(),
  procedureCode: z.string().trim().max(80).nullish(),
  amount: z.number().nonnegative().max(100000000),
  taxRate: z.number().nonnegative().max(100).default(0),
  currency: z.literal("PKR").default("PKR"),
  doctorId: uuidSchema.nullish(),
  bedId: uuidSchema.nullish(),
});

const isDoctor = (req: Request) => req.role?.name.toLowerCase() === "doctor";

const getRequestDoctorId = async (tenantId: string, userId: string) => {
  const doctor = await db.doctorProfile.findFirst({ where: { tenantId, userId, isActive: true }, select: { id: true } });
  if (!doctor) throw new ApiError(403, "Your account is not linked to an active doctor profile.");
  return doctor.id;
};

export const listRates = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId, userId } = getTenantContext(req);
  const category = req.query.category ? categories.parse(req.query.category) : undefined;
  const doctorId = isDoctor(req) ? await getRequestDoctorId(tenantId, userId) : undefined;
  const rates = await db.billingRate.findMany({ where: { tenantId, ...(category ? { category } : {}), ...(doctorId ? { doctorId } : {}) }, orderBy: [{ category: "asc" }, { name: "asc" }] });
  return res.status(200).json(new ApiResponse(200, rates.map((rate) => ({ ...rate, amount: Number(rate.amount), taxRate: Number(rate.taxRate) })), "Billing rates fetched successfully."));
});

export const createRate = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId, userId } = getTenantContext(req);
  const input = parseRequest(rateSchema, req.body);
  const doctorId = isDoctor(req) ? await getRequestDoctorId(tenantId, userId) : input.doctorId ?? null;
  if (isDoctor(req) && (input.category !== "appointment" || !input.appointmentType?.trim())) {
    throw new ApiError(400, "Doctors can create appointment rates only, and appointment type is required.");
  }
  const rate = await db.billingRate.create({ data: { ...input, amount: amountString(input.amount), taxRate: amountString(input.taxRate), tenantId, appointmentType: input.appointmentType ?? null, procedureCode: input.procedureCode ?? null, doctorId, bedId: isDoctor(req) ? null : input.bedId ?? null } });
  await writeAudit(req, "create", "BillingRate", rate.id, { code: rate.code, category: rate.category, amount: input.amount });
  return res.status(201).json(new ApiResponse(201, { ...rate, amount: Number(rate.amount), taxRate: Number(rate.taxRate) }, "Billing rate created successfully."));
});

export const updateRate = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId, userId } = getTenantContext(req);
  const rateId = parseParamUuid(req, "rateId");
  const input = parseRequest(rateSchema.partial().refine((value) => Object.keys(value).length > 0), req.body);
  const current = await db.billingRate.findFirst({ where: { id: rateId, tenantId } });
  if (!current) throw new ApiError(404, "Billing rate not found.");
  if (isDoctor(req)) {
    const doctorId = await getRequestDoctorId(tenantId, userId);
    if (current.doctorId !== doctorId || current.category !== "appointment") throw new ApiError(403, "You can update only your own appointment rates.");
    if (input.category && input.category !== "appointment") throw new ApiError(400, "Doctor rates must use the appointment category.");
    if (input.appointmentType !== undefined && !input.appointmentType?.trim()) throw new ApiError(400, "Appointment type is required.");
  }
  const rate = await db.billingRate.update({ where: { id: rateId }, data: { ...input, ...(isDoctor(req) ? { category: "appointment", doctorId: current.doctorId, bedId: null } : {}), ...(input.amount === undefined ? {} : { amount: amountString(input.amount) }), ...(input.taxRate === undefined ? {} : { taxRate: amountString(input.taxRate) }) }, });
  await writeAudit(req, "update", "BillingRate", rate.id, { ...input });
  return res.status(200).json(new ApiResponse(200, { ...rate, amount: Number(rate.amount), taxRate: Number(rate.taxRate) }, "Billing rate updated successfully."));
});

const appointmentInvoiceSchema = z.object({ appointmentId: uuidSchema, rateId: uuidSchema, dueAt: z.coerce.date().nullish(), notes: z.string().trim().max(2000).nullish() });

export const createAppointmentInvoice = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId, userId } = getTenantContext(req);
  const input = parseRequest(appointmentInvoiceSchema, req.body);
  const invoice = await db.$transaction(async (tx) => {
    const appointment = await tx.appointment.findFirst({ where: { id: input.appointmentId, tenantId }, select: { id: true, patientId: true, doctorId: true } });
    if (!appointment) throw new ApiError(404, "Appointment not found.");
    const existing = await tx.billingInvoice.findFirst({ where: { appointmentId: appointment.id, tenantId } });
    if (existing) throw new ApiError(409, "This appointment already has an invoice.");
    const rate = await tx.billingRate.findFirst({ where: { id: input.rateId, tenantId, category: "appointment", isActive: true, doctorId: appointment.doctorId } });
    if (!rate) throw new ApiError(409, "The selected rate is not active or does not belong to the appointment doctor.");
    const amount = Number(rate.amount);
    const tax = roundMoney(amount * Number(rate.taxRate) / 100);
    const created = await tx.billingInvoice.create({ data: { tenantId, patientId: appointment.patientId, appointmentId: appointment.id, kind: "appointment", invoiceNumber: invoiceNumber(), currency: rate.currency, subtotal: amountString(amount), taxAmount: amountString(tax), totalAmount: amountString(amount + tax), balanceAmount: amountString(amount + tax), createdBy: userId, dueAt: input.dueAt ?? null, notes: input.notes ?? null, Items: { create: { category: "appointment", description: rate.name, quantity: 1, unitPrice: rate.amount, taxRate: rate.taxRate, subtotal: rate.amount, taxAmount: amountString(tax), totalAmount: amountString(amount + tax) } } }, include: invoiceInclude });
    return created;
  });
  await writeAudit(req, "create", "BillingInvoice", invoice.id, { kind: "appointment", appointmentId: input.appointmentId, rateId: input.rateId });
  return res.status(201).json(new ApiResponse(201, serializeInvoice(invoice), "Appointment invoice created successfully."));
});

const inpatientInvoiceSchema = z.object({ admissionId: uuidSchema, dueAt: z.coerce.date().nullish(), notes: z.string().trim().max(2000).nullish() });

export const createInpatientInvoice = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId, userId } = getTenantContext(req);
  const input = parseRequest(inpatientInvoiceSchema, req.body);
  const admission = await db.admission.findFirst({ where: { id: input.admissionId, tenantId }, include: { Encounter: { select: { patientId: true } } } });
  if (!admission) throw new ApiError(404, "Admission not found.");
  const invoice = await db.billingInvoice.create({ data: { tenantId, patientId: admission.Encounter.patientId, admissionId: input.admissionId, kind: "inpatient", invoiceNumber: invoiceNumber(), currency: "PKR", subtotal: 0, taxAmount: 0, totalAmount: 0, balanceAmount: 0, createdBy: userId, dueAt: input.dueAt ?? null, notes: input.notes ?? null } });
  await writeAudit(req, "create", "BillingInvoice", invoice.id, { kind: "inpatient", admissionId: input.admissionId });
  return res.status(201).json(new ApiResponse(201, serializeInvoice({ ...invoice, Items: [], Payments: [] }), "Inpatient invoice created successfully."));
});

const invoiceItemSchema = z.object({ rateId: uuidSchema, quantity: z.number().positive().max(100000), description: z.string().trim().max(300).optional() });

export const addInvoiceItem = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId } = getTenantContext(req);
  const invoiceId = parseParamUuid(req, "invoiceId");
  const input = parseRequest(invoiceItemSchema, req.body);
  const invoice = await db.$transaction(async (tx) => {
    const current = await tx.billingInvoice.findFirst({ where: { id: invoiceId, tenantId } });
    if (!current || current.status === "void" || current.status === "paid") throw new ApiError(409, "Only an open invoice can receive new charges.");
    const rate = await tx.billingRate.findFirst({ where: { id: input.rateId, tenantId, isActive: true } });
    if (!rate) throw new ApiError(404, "Active billing rate not found.");
    const subtotal = roundMoney(Number(rate.amount) * input.quantity);
    const tax = roundMoney(subtotal * Number(rate.taxRate) / 100);
    await tx.billingInvoiceItem.create({ data: { tenantId, invoiceId, category: rate.category, description: input.description ?? rate.name, quantity: input.quantity, unitPrice: rate.amount, taxRate: rate.taxRate, subtotal: amountString(subtotal), taxAmount: amountString(tax), totalAmount: amountString(subtotal + tax) } });
    return recalculateInvoice(tx, invoiceId, tenantId);
  });
  await writeAudit(req, "create", "BillingInvoiceItem", invoiceId, { rateId: input.rateId, quantity: input.quantity });
  return res.status(201).json(new ApiResponse(201, serializeInvoice(invoice), "Invoice charge added successfully."));
});

const paymentSchema = z.object({ amount: z.number().positive(), method: paymentMethods, reference: z.string().trim().max(160).nullish(), notes: z.string().trim().max(1000).nullish() });

export const collectPayment = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId, userId } = getTenantContext(req);
  const invoiceId = parseParamUuid(req, "invoiceId");
  const input = parseRequest(paymentSchema, req.body);
  const invoice = await db.$transaction(async (tx) => {
    const current = await tx.billingInvoice.findFirst({ where: { id: invoiceId, tenantId } });
    if (!current || current.status === "void" || current.status === "paid") throw new ApiError(409, "This invoice cannot accept payment.");
    const balance = Number(current.balanceAmount);
    if (Math.abs(input.amount - balance) > 0.01) throw new ApiError(400, "Full invoice balance must be paid.");
    await tx.billingPayment.create({ data: { tenantId, invoiceId, collectedBy: userId, amount: amountString(input.amount), method: input.method, reference: input.reference ?? null, notes: input.notes ?? null } });
    return recalculateInvoice(tx, invoiceId, tenantId);
  });
  await writeAudit(req, "create", "BillingPayment", invoiceId, { amount: input.amount, method: input.method });
  return res.status(201).json(new ApiResponse(201, serializeInvoice(invoice), "Payment recorded successfully."));
});

export const getInvoice = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId } = getTenantContext(req);
  const invoiceId = parseParamUuid(req, "invoiceId");
  const invoice = await db.billingInvoice.findFirst({ where: { id: invoiceId, tenantId }, include: invoiceInclude });
  if (!invoice) throw new ApiError(404, "Invoice not found.");
  return res.status(200).json(new ApiResponse(200, serializeInvoice(invoice), "Invoice fetched successfully."));
});

export const listInvoices = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId } = getTenantContext(req);
  const status = req.query.status ? invoiceStatuses.parse(req.query.status) : undefined;
  const patientId = req.query.patientId ? uuidSchema.parse(req.query.patientId) : undefined;
  const invoices = await db.billingInvoice.findMany({ where: { tenantId, ...(status ? { status } : {}), ...(patientId ? { patientId } : {}) }, orderBy: { createdAt: "desc" }, take: 100, include: invoiceInclude });
  return res.status(200).json(new ApiResponse(200, invoices.map(serializeInvoice), "Invoices fetched successfully."));
});

export const listBillableAppointments = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId } = getTenantContext(req);
  const appointments = await db.appointment.findMany({
    where: { tenantId, status: { in: ["booked", "completed"] }, BillingInvoice: null },
    orderBy: { scheduledAt: "desc" },
    take: 100,
    select: { id: true, scheduledAt: true, doctorId: true, Patient: { select: { id: true, mrn: true, firstName: true, lastName: true } }, DoctorProfile: { select: { User: { select: { name: true } } } } },
  });
  return res.status(200).json(new ApiResponse(200, appointments, "Billable appointments fetched successfully."));
});

export const listBillableAdmissions = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId } = getTenantContext(req);
  const admissions = await db.admission.findMany({
    where: { tenantId, status: "admitted", BillingInvoice: null },
    orderBy: { admittedAt: "desc" },
    take: 100,
    include: { Encounter: { select: { Patient: { select: { mrn: true, firstName: true, lastName: true } } } } },
  });
  return res.status(200).json(new ApiResponse(200, admissions, "Billable admissions fetched successfully."));
});
