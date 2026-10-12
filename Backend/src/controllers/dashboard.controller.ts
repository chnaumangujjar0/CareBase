import type { Request, Response } from "express";
import { db } from "../db/index.js";
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
        scheduledAt: { gte: startOfDay, lt: endOfDay },
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
