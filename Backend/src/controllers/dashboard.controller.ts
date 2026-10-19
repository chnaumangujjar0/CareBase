import type { Request, Response } from "express";
import { z } from "zod";
import { db } from "../db/index.js";
import { Prisma } from "../generated/prisma/index.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getDashboardSummary = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId;
  const userId = req.user?.id;
  if (!tenantId || !userId) throw new ApiError(401, "Authenticated tenant context is required");

  const role = req.role?.name;
  const isDoctor = role?.toLowerCase() === "doctor";
  const doctor = isDoctor
    ? await db.doctorProfile.findFirst({
        where: { userId, tenantId, isActive: true },
        select: { id: true },
      })
    : null;
  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
  const appointmentWhere = {
    tenantId,
    ...(isDoctor ? { doctorId: doctor?.id ?? "00000000-0000-0000-0000-000000000000" } : {}),
  };
  const encounterWhere = {
    tenantId,
    ...(isDoctor ? { doctorId: doctor?.id ?? "00000000-0000-0000-0000-000000000000" } : {}),
  };

  const [
    activePatients,
    newPatientsToday,
    activeDoctors,
    activeStaff,
    todayAppointmentGroups,
    upcomingAppointments,
    bedGroups,
    activeAdmissions,
    waitingEncounters,
    openEncountersToday,
  ] = await Promise.all([
    db.patient.count({ where: { tenantId, isActive: true, deletedAt: null } }),
    db.patient.count({ where: { tenantId, isActive: true, deletedAt: null, createdAt: { gte: startOfDay, lt: endOfDay } } }),
    db.doctorProfile.count({ where: { tenantId, isActive: true } }),
    db.staffProfile.count({ where: { tenantId, isActive: true } }),
    db.appointment.groupBy({
      by: ["status"],
      where: { ...appointmentWhere, scheduledAt: { gte: startOfDay, lt: endOfDay } },
      _count: { _all: true },
    }),
    db.appointment.findMany({
      where: {
        ...appointmentWhere,
        scheduledAt: { gte: new Date() },
        status: "booked",
      },
      include: {
        Patient: { select: { id: true, mrn: true, firstName: true, lastName: true } },
        Department: { select: { id: true, name: true } },
        DoctorProfile: { select: { id: true, User: { select: { name: true } } } },
      },
      orderBy: { scheduledAt: "asc" },
      take: 12,
    }),
    db.bed.groupBy({ by: ["status"], where: { tenantId }, _count: { _all: true } }),
    db.admission.count({ where: { tenantId, status: "admitted" } }),
    db.encounter.count({ where: { ...encounterWhere, status: "waiting" } }),
    db.encounter.count({
      where: { ...encounterWhere, startedAt: { gte: startOfDay, lt: endOfDay }, status: { not: "closed" } },
    }),
  ]);

  const appointmentsByStatus = todayAppointmentGroups.reduce<Record<string, number>>((result, group) => {
    result[group.status] = group._count._all;
    return result;
  }, {});
  const bedsByStatus = bedGroups.reduce<Record<string, number>>((result, group) => {
    result[group.status] = group._count._all;
    return result;
  }, {});

  return res.status(200).json(new ApiResponse(200, {
    generatedAt: new Date().toISOString(),
    scope: isDoctor ? "doctor" : "hospital",
    stats: {
      activePatients,
      newPatientsToday,
      activeDoctors,
      activeStaff,
      appointmentsToday: Object.values(appointmentsByStatus).reduce((sum, count) => sum + count, 0),
      bookedAppointmentsToday: appointmentsByStatus.booked ?? 0,
      completedAppointmentsToday: appointmentsByStatus.completed ?? 0,
      cancelledAppointmentsToday: appointmentsByStatus.cancelled ?? 0,
      noShowAppointmentsToday: appointmentsByStatus.no_show ?? 0,
      availableBeds: bedsByStatus.available ?? 0,
      occupiedBeds: bedsByStatus.occupied ?? 0,
      totalBeds: Object.values(bedsByStatus).reduce((sum, count) => sum + count, 0),
      activeAdmissions,
      waitingEncounters,
      openEncountersToday,
    },
    appointments: upcomingAppointments,
  }, "Dashboard summary fetched successfully."));
});

export const getDashboardMonthlySales = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) throw new ApiError(401, "Authenticated tenant context is required");
  if (!["owner", "admin"].includes(req.role?.name.toLowerCase() ?? "")) {
    throw new ApiError(403, "Only hospital administrators can view monthly sales.");
  }

  const query = z.object({
    months: z.coerce.number().int().refine((value) => [3, 6, 12].includes(value), "Choose 3, 6, or 12 months").default(6),
    pharmacyId: z.uuid().optional(),
  }).safeParse(req.query);
  if (!query.success) throw new ApiError(400, query.error.issues[0]?.message ?? "Invalid sales filters");

  if (query.data.pharmacyId) {
    const pharmacy = await db.pharmacy.findFirst({
      where: { id: query.data.pharmacyId, tenantId },
      select: { id: true },
    });
    if (!pharmacy) throw new ApiError(404, "Pharmacy not found.");
  }

  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - query.data.months + 1, 1));
  const pharmacyFilter = query.data.pharmacyId
    ? Prisma.sql`AND "pharmacyId" = ${query.data.pharmacyId}::uuid`
    : Prisma.empty;
  const [rows, pharmacies] = await Promise.all([
    db.$queryRaw<Array<{ month: string; sales: Prisma.Decimal; transactions: bigint }>>`
      SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') AS month,
             COALESCE(SUM("totalAmount"), 0) AS sales,
             COUNT(*) AS transactions
      FROM "Sale"
      WHERE "tenantId" = ${tenantId}::uuid
        AND "createdAt" >= ${start}
        AND "createdAt" <= ${now}
        ${pharmacyFilter}
      GROUP BY date_trunc('month', "createdAt")
      ORDER BY date_trunc('month', "createdAt") ASC
    `,
    db.pharmacy.findMany({
      where: { tenantId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rowsByMonth = new Map(rows.map((row) => [row.month, row]));
  const monthlySales = Array.from({ length: query.data.months }, (_, offset) => {
    const monthDate = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + offset, 1));
    const month = `${monthDate.getUTCFullYear()}-${String(monthDate.getUTCMonth() + 1).padStart(2, "0")}`;
    const row = rowsByMonth.get(month);
    return { month, sales: row ? Number(row.sales) : 0, transactions: row ? Number(row.transactions) : 0 };
  });

  return res.status(200).json(new ApiResponse(200, {
    months: query.data.months,
    pharmacyId: query.data.pharmacyId ?? null,
    monthlySales,
    pharmacies,
    totalSales: monthlySales.reduce((total, row) => total + row.sales, 0),
    totalTransactions: monthlySales.reduce((total, row) => total + row.transactions, 0),
  }, "Monthly pharmacy sales fetched successfully."));
});

export const getDashboardMonthlyRevenue = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) throw new ApiError(401, "Authenticated tenant context is required");
  if (!["owner", "admin"].includes(req.role?.name.toLowerCase() ?? "")) {
    throw new ApiError(403, "Only hospital administrators can view monthly revenue.");
  }

  const parsed = z.object({
    months: z.coerce.number().int().refine((value) => [3, 6, 12].includes(value), "Choose 3, 6, or 12 months").default(6),
    source: z.enum(["all", "billing", "pharmacy"]).default("all"),
    paymentMethod: z.enum(["cash", "card", "insurance"]).optional(),
  }).safeParse(req.query);
  if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid revenue filters");

  const { months, source, paymentMethod } = parsed.data;
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months + 1, 1));
  const billingMethodFilter = paymentMethod === "insurance"
    ? Prisma.sql`AND false`
    : paymentMethod ? Prisma.sql`AND bp."method" = ${paymentMethod}` : Prisma.empty;
  const saleMethodFilter = paymentMethod ? Prisma.sql`AND s."paymentMethod" = ${paymentMethod}` : Prisma.empty;
  const [billingRows, pharmacyRows] = await Promise.all([
    source === "pharmacy"
      ? Promise.resolve([] as Array<{ month: string; amount: Prisma.Decimal; transactions: bigint }>)
      : db.$queryRaw<Array<{ month: string; amount: Prisma.Decimal; transactions: bigint }>>`
          SELECT to_char(date_trunc('month', bp."createdAt"), 'YYYY-MM') AS month,
                 COALESCE(SUM(bp.amount), 0) AS amount, COUNT(*) AS transactions
          FROM "BillingPayment" bp
          INNER JOIN "BillingInvoice" bi ON bi.id = bp."invoiceId" AND bi."tenantId" = bp."tenantId"
          WHERE bp."tenantId" = ${tenantId}::uuid
            AND bp."createdAt" >= ${start} AND bp."createdAt" <= ${now}
            AND bp.status = 'completed'
            ${billingMethodFilter}
          GROUP BY date_trunc('month', bp."createdAt")
          ORDER BY date_trunc('month', bp."createdAt") ASC
        `,
    source === "billing"
      ? Promise.resolve([] as Array<{ month: string; amount: Prisma.Decimal; transactions: bigint }>)
      : db.$queryRaw<Array<{ month: string; amount: Prisma.Decimal; transactions: bigint }>>`
          SELECT to_char(date_trunc('month', s."createdAt"), 'YYYY-MM') AS month,
                 COALESCE(SUM(s."totalAmount"), 0) AS amount, COUNT(*) AS transactions
          FROM "Sale" s
          WHERE s."tenantId" = ${tenantId}::uuid
            AND s."createdAt" >= ${start} AND s."createdAt" <= ${now}
            AND s."billingMode" = 'immediate'
            ${saleMethodFilter}
          GROUP BY date_trunc('month', s."createdAt")
          ORDER BY date_trunc('month', s."createdAt") ASC
        `,
  ]);

  const billingByMonth = new Map(billingRows.map((row) => [row.month, row]));
  const pharmacyByMonth = new Map(pharmacyRows.map((row) => [row.month, row]));
  const monthlyRevenue = Array.from({ length: months }, (_, offset) => {
    const date = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + offset, 1));
    const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    const billing = billingByMonth.get(month);
    const pharmacySales = pharmacyByMonth.get(month);
    const billingAmount = billing ? Number(billing.amount) : 0;
    const pharmacyAmount = pharmacySales ? Number(pharmacySales.amount) : 0;
    return {
      month,
      billing: billingAmount,
      pharmacySales: pharmacyAmount,
      revenue: billingAmount + pharmacyAmount,
      transactions: Number(billing?.transactions ?? 0n) + Number(pharmacySales?.transactions ?? 0n),
    };
  });

  return res.status(200).json(new ApiResponse(200, {
    months, source, paymentMethod: paymentMethod ?? null, monthlyRevenue,
    totalRevenue: monthlyRevenue.reduce((total, row) => total + row.revenue, 0),
    totalTransactions: monthlyRevenue.reduce((total, row) => total + row.transactions, 0),
  }, "Monthly hospital revenue fetched successfully."));
});
