import type { Request, Response } from "express";
import { z } from "zod";
import { db } from "../db/index.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const uuidSchema = z.uuid();
const encounterTypeSchema = z.enum(["outpatient", "inpatient", "emergency"]);
const encounterSourceSchema = z.enum(["appointment", "walk_in", "emergency", "referral"]);
const encounterStatusSchema = z.enum(["waiting", "in_progress", "closed"]);
const dispositionSchema = z.enum([
  "discharged_home",
  "admitted",
  "transferred",
  "referred_out",
  "left_without_being_seen",
  "deceased",
]);
const triageLevelSchema = z.enum(["critical", "urgent", "normal"]);
const surgeryStatusSchema = z.enum(["scheduled", "in_progress", "completed", "cancelled", "postponed"]);

const asApiError = (error: unknown): never => {
  const record =
    typeof error === "object" && error !== null
      ? (error as Record<string, unknown>)
      : undefined;
  const meta =
    typeof record?.meta === "object" && record.meta !== null
      ? (record.meta as Record<string, unknown>)
      : undefined;
  const detail = [record?.message, meta?.constraint, meta?.database_error]
    .filter((value): value is string => typeof value === "string")
    .join(" ");

  if (
    record?.code === "23P01" ||
    record?.code === "23505" ||
    record?.code === "23514" ||
    record?.code === "P2004" ||
    record?.code === "P2034"
  ) {
    throw new ApiError(
      409,
      /overlap/i.test(detail)
        ? "This action conflicts with the current clinical schedule."
        : "The record changed or conflicts with the current clinical resource state; refresh and retry.",
    );
  }
  if (record?.code === "P2002" || record?.code === "P2003") {
    throw new ApiError(409, "This record conflicts with an existing or related record.");
  }
  throw error;
};

const withDbConflictHandling = async <T>(operation: Promise<T>): Promise<T> => {
  try {
    return await operation;
  } catch (error) {
    return asApiError(error);
  }
};

const tenantContext = (req: Request) => {
  const tenantId = req.user?.tenantId;
  const userId = req.user?.id;
  if (!tenantId || !userId) {
    throw new ApiError(401, "Authenticated tenant context is required");
  }
  return { tenantId, userId };
};

type ClinicalTransaction = Parameters<Parameters<typeof db.$transaction>[0]>[0];

const writeAudit = (
  tx: ClinicalTransaction,
  req: Request,
  action: string,
  entityType: string,
  entityId: string,
  newValue: Record<string, string | number | boolean | null>,
) => tx.auditLog.create({
  data: {
    action,
    entityType,
    entityId,
    tenantId: req.user!.tenantId,
    userId: req.user!.id,
    ipAddress: req.ip ?? null,
    userAgent: req.get("user-agent") ?? null,
    newValue,
  },
});

const parseBody = <T extends z.ZodType>(schema: T, input: unknown): z.output<T> => {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new ApiError(
      400,
      "Invalid request details",
      parsed.error.issues.map(({ path, message }) => ({ path: path.join("."), message })),
    );
  }
  return parsed.data;
};

const paramUuid = (req: Request, key: string) => {
  const value = req.params[key];
  const parsed = uuidSchema.safeParse(Array.isArray(value) ? value[0] : value);
  if (!parsed.success) throw new ApiError(400, `A valid ${key} is required`);
  return parsed.data;
};

const currentDoctor = async (userId: string, tenantId: string) => {
  const doctor = await db.doctorProfile.findFirst({
    where: { userId, tenantId, isActive: true },
    select: { id: true },
  });
  if (!doctor) throw new ApiError(403, "An active doctor profile is required");
  return doctor;
};

const encounterInclude = {
  Patient: { select: { id: true, mrn: true, firstName: true, lastName: true, contactPhone: true } },
  Department: { select: { id: true, name: true } },
  DoctorProfile: { select: { id: true, User: { select: { id: true, name: true } } } },
  Appointment: { select: { id: true, scheduledAt: true, status: true } },
} as const;

const createEncounterSchema = z.object({
  patientId: uuidSchema.optional(),
  departmentId: uuidSchema.optional(),
  doctorId: uuidSchema.nullish(),
  appointmentId: uuidSchema.nullish(),
  type: encounterTypeSchema.default("outpatient"),
  source: encounterSourceSchema.default("walk_in"),
  chiefComplaint: z.string().trim().max(4000).nullish(),
  arrivalMode: z.enum(["walk_in", "ambulance", "referral"]).nullish(),
  triageLevel: triageLevelSchema.nullish(),
});

export const listEncounters = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId, userId } = tenantContext(req);
  const filters = parseBody(
    z.object({
      departmentId: uuidSchema.optional(),
      doctorId: uuidSchema.optional(),
      status: encounterStatusSchema.optional(),
      triageLevel: triageLevelSchema.optional(),
      patientId: uuidSchema.optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(25),
    }),
    req.query,
  );
  const where = {
    tenantId,
    ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
    ...(filters.doctorId ? { doctorId: filters.doctorId } : {}),
    ...(filters.patientId ? { patientId: filters.patientId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.triageLevel ? { triageLevel: filters.triageLevel } : {}),
  };
  const [items, total] = await Promise.all([
    db.encounter.findMany({
      where,
      include: encounterInclude,
      orderBy: [{ queueDate: "desc" }, { queueNumber: "asc" }, { startedAt: "asc" }],
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    }),
    db.encounter.count({ where }),
  ]);
  await db.auditLog.create({
    data: {
      action: "list",
      entityType: "Encounter",
      tenantId,
      userId,
      ipAddress: req.ip ?? null,
      userAgent: req.get("user-agent") ?? null,
    },
  });
  return res.status(200).json(new ApiResponse(200, {
    items,
    pagination: { page: filters.page, limit: filters.limit, total, totalPages: Math.ceil(total / filters.limit) },
  }, "Encounters fetched successfully."));
});

export const createEncounter = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId, userId } = tenantContext(req);
  const input = parseBody(createEncounterSchema, req.body);
  const result = await withDbConflictHandling(db.$transaction(async (tx) => {
    const appointment = input.appointmentId
      ? await tx.appointment.findFirst({
          where: { id: input.appointmentId, tenantId },
          select: { id: true, patientId: true, departmentId: true, doctorId: true, status: true },
        })
      : null;
    if (input.appointmentId && !appointment) throw new ApiError(404, "Appointment not found.");
    if (appointment && appointment.status !== "booked") {
      throw new ApiError(409, "Only a booked appointment can be checked in.");
    }
    const patientId = appointment?.patientId ?? input.patientId;
    const departmentId = appointment?.departmentId ?? input.departmentId;
    const doctorId = appointment?.doctorId ?? input.doctorId ?? null;
    if (!patientId || !departmentId) {
      throw new ApiError(400, "A patient and department are required for a walk-in or emergency encounter.");
    }

    const [patient, department, doctor] = await Promise.all([
      tx.patient.findFirst({
        where: { id: patientId, tenantId, isActive: true, deletedAt: null },
        select: { id: true },
      }),
      tx.department.findFirst({
        where: { id: departmentId, tenantId, isActive: true },
        select: { id: true },
      }),
      doctorId
        ? tx.doctorProfile.findFirst({
            where: { id: doctorId, tenantId, isActive: true },
            select: { id: true, departmentId: true, version: true },
          })
        : null,
    ]);
    if (!patient) throw new ApiError(404, "Active patient not found in this hospital.");
    if (!department) throw new ApiError(404, "Active department not found in this hospital.");
    if (doctorId && !doctor) throw new ApiError(404, "Active doctor not found in this hospital.");
    if (doctor && doctor.departmentId !== departmentId) {
      throw new ApiError(400, "The selected doctor does not belong to this department.");
    }

    const queueDate = new Date();
    queueDate.setUTCHours(0, 0, 0, 0);
    const lockKey = `${tenantId}:${departmentId}:${queueDate.toISOString().slice(0, 10)}`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
    const last = await tx.encounter.aggregate({
      where: { tenantId, departmentId, queueDate },
      _max: { queueNumber: true },
    });
    const encounter = await tx.encounter.create({
      data: {
        tenantId,
        patientId,
        departmentId,
        doctorId,
        appointmentId: appointment?.id ?? null,
        type: input.source === "emergency" ? "emergency" : input.type,
        source: appointment ? "appointment" : input.source,
        chiefComplaint: input.chiefComplaint ?? null,
        arrivalMode: input.arrivalMode ?? null,
        triageLevel: input.triageLevel ?? null,
        ...(input.triageLevel ? { triagedAt: new Date() } : {}),
        queueDate,
        queueNumber: (last._max.queueNumber ?? 0) + 1,
      },
      include: encounterInclude,
    });
    await writeAudit(tx, req, "create", "Encounter", encounter.id, {
      source: encounter.source,
      type: encounter.type,
      actorId: userId,
    });
    return encounter;
  }));
  return res.status(201).json(new ApiResponse(201, result, "Encounter checked in successfully."));
});

export const getEncounter = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId } = tenantContext(req);
  const id = paramUuid(req, "encounterId");
  const encounter = await db.encounter.findFirst({
    where: { id, tenantId },
    include: {
      ...encounterInclude,
      Consultation: { orderBy: { createdAt: "asc" } },
      Prescription: { include: { PrescriptionItem: { include: { Medicine: true } } } },
      Admission: { include: { BedAssignment: { where: { releasedAt: null }, include: { Bed: true } }, DischargeSummary: true } },
      BedAssignment: { where: { releasedAt: null }, include: { Bed: true } },
      SurgeryCase: { include: { OperatingTheatre: true, SurgeryTeamMember: true } },
      PatientMedicalData: { orderBy: { recordedAt: "desc" } },
    },
  });
  if (!encounter) throw new ApiError(404, "Encounter not found.");
  await db.auditLog.create({
    data: {
      action: "read",
      entityType: "Encounter",
      entityId: id,
      tenantId,
      userId: req.user!.id,
      ipAddress: req.ip ?? null,
      userAgent: req.get("user-agent") ?? null,
    },
  });
  return res.status(200).json(new ApiResponse(200, encounter, "Encounter fetched successfully."));
});

const updateEncounterSchema = z.object({
  status: encounterStatusSchema.optional(),
  disposition: dispositionSchema.nullish(),
  doctorId: uuidSchema.nullish(),
  triageLevel: triageLevelSchema.nullish(),
  chiefComplaint: z.string().trim().max(4000).nullish(),
  version: z.number().int().positive(),
}).refine((input) => Object.keys(input).some((key) => key !== "version"), {
  message: "Provide at least one encounter field to update.",
});

export const updateEncounter = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId, userId } = tenantContext(req);
  const id = paramUuid(req, "encounterId");
  const input = parseBody(updateEncounterSchema, req.body);
  const result = await withDbConflictHandling(db.$transaction(async (tx) => {
    const current = await tx.encounter.findFirst({ where: { id, tenantId } });
    if (!current) throw new ApiError(404, "Encounter not found.");
    if (current.version !== input.version) throw new ApiError(409, "Encounter changed; refresh and try again.");
    if (current.status === "closed") throw new ApiError(409, "A closed encounter cannot be changed.");
    if (input.status === "closed" && !input.disposition) {
      throw new ApiError(400, "A disposition is required to close an encounter.");
    }
    if (input.status && input.status !== current.status &&
        !(current.status === "waiting" && input.status === "in_progress") &&
        !(input.status === "closed")) {
      throw new ApiError(409, "Invalid encounter status transition.");
    }
    if (input.status === "closed") {
      const [activeAdmission, activeBedAssignment, activeSurgery] = await Promise.all([
        tx.admission.findFirst({ where: { encounterId: id, tenantId, status: "admitted" }, select: { id: true } }),
        tx.bedAssignment.findFirst({ where: { encounterId: id, tenantId, releasedAt: null }, select: { id: true } }),
        tx.surgeryCase.findFirst({
          where: { encounterId: id, tenantId, status: { in: ["scheduled", "in_progress"] } },
          select: { id: true },
        }),
      ]);
      if (activeAdmission || activeBedAssignment || activeSurgery) {
        throw new ApiError(409, "Resolve active admissions, bed assignments, and surgeries before closing this encounter.");
      }
    }
    if (input.doctorId) {
      const doctor = await tx.doctorProfile.findFirst({
        where: { id: input.doctorId, tenantId, isActive: true, departmentId: current.departmentId },
        select: { id: true },
      });
      if (!doctor) throw new ApiError(404, "Active doctor not found in this department.");
    }
    const updated = await tx.encounter.updateMany({
      where: { id, tenantId, version: input.version },
      data: {
        ...(input.status ? { status: input.status } : {}),
        ...(input.disposition !== undefined ? { disposition: input.disposition } : {}),
        ...(input.doctorId !== undefined ? { doctorId: input.doctorId } : {}),
        ...(input.triageLevel !== undefined ? { triageLevel: input.triageLevel } : {}),
        ...(input.chiefComplaint !== undefined ? { chiefComplaint: input.chiefComplaint } : {}),
        ...(input.triageLevel ? { triagedAt: new Date(), triagedBy: req.user!.id } : {}),
        ...(input.status === "closed" ? { endedAt: new Date() } : {}),
        version: { increment: 1 },
      },
    });
    if (!updated.count) throw new ApiError(409, "Encounter changed; refresh and try again.");
    if (input.status === "closed" && current.appointmentId) {
      await tx.appointment.updateMany({
        where: { id: current.appointmentId, tenantId, status: "booked" },
        data: { status: "completed", updatedBy: userId, version: { increment: 1 } },
      });
    }
    const encounter = await tx.encounter.findFirst({ where: { id, tenantId }, include: encounterInclude });
    await writeAudit(tx, req, "update", "Encounter", id, {
      status: input.status ?? current.status,
      actorId: userId,
    });
    return encounter;
  }, { isolationLevel: "Serializable" }));
  return res.status(200).json(new ApiResponse(200, result, "Encounter updated successfully."));
});

const consultationSchema = z.object({
  kind: z.enum(["initial", "ward_round", "pre_operative"]).default("initial"),
  chiefComplaint: z.string().trim().max(4000).nullish(),
  findings: z.string().trim().max(10000).nullish(),
  diagnosis: z.string().trim().max(4000).nullish(),
  notes: z.string().trim().max(10000).nullish(),
  followUpDate: z.coerce.date().nullish(),
});

export const createConsultation = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId, userId } = tenantContext(req);
  const encounterId = paramUuid(req, "encounterId");
  const input = parseBody(consultationSchema, req.body);
  const doctor = await currentDoctor(userId, tenantId);
  const consultation = await db.$transaction(async (tx) => {
    const encounter = await tx.encounter.findFirst({
      where: { id: encounterId, tenantId, status: { not: "closed" } },
      select: { id: true },
    });
    if (!encounter) throw new ApiError(404, "Open encounter not found.");
    const created = await tx.consultation.create({
      data: { ...input, tenantId, encounterId, doctorId: doctor.id },
    });
    await writeAudit(tx, req, "create", "Consultation", created.id, { encounterId, doctorId: doctor.id });
    return created;
  });
  return res.status(201).json(new ApiResponse(201, consultation, "Consultation recorded successfully."));
});

const medicineSchema = z.object({
  name: z.string().trim().min(1).max(200),
  genericName: z.string().trim().max(200).nullish(),
  form: z.string().trim().max(80).nullish(),
  strength: z.string().trim().max(80).nullish(),
});

export const listMedicines = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId } = tenantContext(req);
  const query = parseBody(z.object({
    search: z.string().trim().max(100).optional(),
    includeInactive: z.preprocess((value) => value === true || value === "true", z.boolean()).default(false),
  }), req.query);
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
  return res.status(200).json(new ApiResponse(200, medicines, "Medicines fetched successfully."));
});

export const createMedicine = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId } = tenantContext(req);
  const input = parseBody(medicineSchema, req.body);
  const medicine = await db.$transaction(async (tx) => {
    const created = await tx.medicine.create({ data: { ...input, tenantId } });
    await writeAudit(tx, req, "create", "Medicine", created.id, { active: true });
    return created;
  });
  return res.status(201).json(new ApiResponse(201, medicine, "Medicine added successfully."));
});

export const updateMedicine = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId } = tenantContext(req);
  const medicineId = paramUuid(req, "medicineId");
  const input = parseBody(z.object({ isActive: z.boolean() }), req.body);
  const updated = await db.$transaction(async (tx) => {
    const result = await tx.medicine.updateMany({
      where: { id: medicineId, tenantId },
      data: { isActive: input.isActive },
    });
    if (!result.count) throw new ApiError(404, "Medicine not found.");
    const medicine = await tx.medicine.findFirst({ where: { id: medicineId, tenantId } });
    await writeAudit(tx, req, "update", "Medicine", medicineId, { isActive: input.isActive });
    return medicine;
  });
  return res.status(200).json(new ApiResponse(200, updated, "Medicine updated successfully."));
});

const prescriptionSchema = z.object({
  notes: z.string().trim().max(4000).nullish(),
  items: z.array(z.object({
    medicineId: uuidSchema,
    dose: z.string().trim().min(1).max(120),
    frequency: z.string().trim().min(1).max(120),
    durationDays: z.number().int().positive().max(3650).nullish(),
    instructions: z.string().trim().max(2000).nullish(),
  })).min(1).max(100),
});

export const createPrescription = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId, userId } = tenantContext(req);
  const encounterId = paramUuid(req, "encounterId");
  const input = parseBody(prescriptionSchema, req.body);
  const doctor = await currentDoctor(userId, tenantId);
  const prescription = await withDbConflictHandling(db.$transaction(async (tx) => {
    const encounter = await tx.encounter.findFirst({
      where: { id: encounterId, tenantId, status: { not: "closed" } },
      select: { id: true },
    });
    if (!encounter) throw new ApiError(404, "Open encounter not found.");
    const requestedIds = [...new Set(input.items.map(({ medicineId }) => medicineId))];
    const medicines = await tx.medicine.findMany({
      where: { id: { in: requestedIds }, tenantId, isActive: true },
      select: { id: true },
    });
    if (medicines.length !== requestedIds.length) throw new ApiError(400, "One or more medicines are inactive or unavailable.");
    const created = await tx.prescription.create({
      data: {
        tenantId,
        encounterId,
        doctorId: doctor.id,
        notes: input.notes ?? null,
        PrescriptionItem: {
          create: input.items.map(({ medicineId, ...item }) => ({
            ...item,
            medicineId,
            tenantId,
          })),
        },
      },
      include: { PrescriptionItem: { include: { Medicine: true } } },
    });
    await writeAudit(tx, req, "create", "Prescription", created.id, {
      encounterId,
      itemCount: created.PrescriptionItem.length,
    });
    return created;
  }));
  return res.status(201).json(new ApiResponse(201, prescription, "Prescription created successfully."));
});

export const cancelPrescription = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId } = tenantContext(req);
  const prescriptionId = paramUuid(req, "prescriptionId");
  const result = await db.$transaction(async (tx) => {
    const updated = await tx.prescription.updateMany({
      where: { id: prescriptionId, tenantId, status: "active" },
      data: { status: "cancelled" },
    });
    if (!updated.count) {
      const exists = await tx.prescription.findFirst({
        where: { id: prescriptionId, tenantId },
        select: { id: true },
      });
      if (!exists) throw new ApiError(404, "Prescription not found.");
      throw new ApiError(409, "Only an active prescription can be cancelled.");
    }
    const prescription = await tx.prescription.findFirst({
      where: { id: prescriptionId, tenantId },
      include: { PrescriptionItem: { include: { Medicine: true } } },
    });
    await writeAudit(tx, req, "cancel", "Prescription", prescriptionId, {
      status: "cancelled",
    });
    return prescription;
  });
  return res.status(200).json(new ApiResponse(200, result, "Prescription cancelled successfully."));
});

const admissionSchema = z.object({
  reason: z.string().trim().min(1).max(4000),
  admissionDiagnosis: z.string().trim().max(4000).nullish(),
});

export const createAdmission = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId, userId } = tenantContext(req);
  const encounterId = paramUuid(req, "encounterId");
  const input = parseBody(admissionSchema, req.body);
  const doctor = await currentDoctor(userId, tenantId);
  const admission = await withDbConflictHandling(db.$transaction(async (tx) => {
    const encounter = await tx.encounter.findFirst({
      where: { id: encounterId, tenantId, status: { not: "closed" } },
      select: { id: true, departmentId: true, version: true },
    });
    if (!encounter) throw new ApiError(404, "Open encounter not found.");
    const created = await tx.admission.create({
      data: {
        ...input,
        tenantId,
        encounterId,
        admittingDoctorId: doctor.id,
        departmentId: encounter.departmentId,
      },
    });
    const encounterUpdated = await tx.encounter.updateMany({
      where: { id: encounterId, tenantId, version: encounter.version, status: { not: "closed" } },
      data: { type: "inpatient", version: { increment: 1 } },
    });
    if (!encounterUpdated.count) throw new ApiError(409, "Encounter changed while admission was being created.");
    await tx.bedAssignment.updateMany({
      where: { encounterId, tenantId, admissionId: null, releasedAt: null },
      data: { admissionId: created.id },
    });
    await writeAudit(tx, req, "create", "Admission", created.id, { encounterId, admittingDoctorId: doctor.id });
    return created;
  }, { isolationLevel: "Serializable" }));
  return res.status(201).json(new ApiResponse(201, admission, "Admission created successfully."));
});

export const listAdmissions = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId } = tenantContext(req);
  const filters = parseBody(z.object({
    status: z.enum(["admitted", "discharged"]).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
  }), req.query);
  const where = {
    tenantId,
    ...(filters.status ? { status: filters.status } : {}),
  };
  const [items, total] = await Promise.all([
    db.admission.findMany({
      where,
      include: {
        Encounter: {
          select: {
            id: true,
            type: true,
            status: true,
            startedAt: true,
            Patient: { select: { id: true, mrn: true, firstName: true, lastName: true } },
            Department: { select: { id: true, name: true } },
          },
        },
        AdmittingDoctor: { select: { User: { select: { id: true, name: true } } } },
        BedAssignment: {
          orderBy: { assignedAt: "desc" },
          include: { Bed: { include: { Room: { include: { Ward: true } } } } },
        },
        DischargeSummary: true,
      },
      orderBy: [{ status: "asc" }, { admittedAt: "desc" }],
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    }),
    db.admission.count({ where }),
  ]);
  return res.status(200).json(new ApiResponse(200, {
    items,
    pagination: { page: filters.page, limit: filters.limit, total, totalPages: Math.ceil(total / filters.limit) },
  }, "Admissions fetched successfully."));
});

const bedAssignmentSchema = z.object({
  bedId: uuidSchema,
  reason: z.enum(["admission", "transfer", "emergency"]).default("admission"),
});

export const assignAdmissionBed = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId, userId } = tenantContext(req);
  const admissionId = paramUuid(req, "admissionId");
  const input = parseBody(bedAssignmentSchema, req.body);
  const assignment = await withDbConflictHandling(db.$transaction(async (tx) => {
    const admission = await tx.admission.findFirst({
      where: { id: admissionId, tenantId, status: "admitted" },
      include: { Encounter: { select: { id: true, patientId: true } } },
    });
    if (!admission) throw new ApiError(404, "Active admission not found.");
    const bed = await tx.bed.findFirst({
      where: { id: input.bedId, tenantId, status: "available", currentPatientId: null },
      select: { id: true },
    });
    if (!bed) throw new ApiError(409, "Bed is unavailable.");
    const claimed = await tx.bed.updateMany({
      where: { id: bed.id, tenantId, status: "available", currentPatientId: null },
      data: { status: "occupied", currentPatientId: admission.Encounter.patientId, version: { increment: 1 } },
    });
    if (!claimed.count) throw new ApiError(409, "Bed was assigned by another user; refresh and try again.");
    const created = await tx.bedAssignment.create({
      data: {
        tenantId,
        bedId: bed.id,
        encounterId: admission.encounterId,
        admissionId: admission.id,
        assignedBy: userId,
        reason: input.reason,
      },
      include: { Bed: true },
    });
    await writeAudit(tx, req, "assign", "BedAssignment", created.id, { bedId: bed.id, admissionId });
    return created;
  }, { isolationLevel: "Serializable" }));
  return res.status(201).json(new ApiResponse(201, assignment, "Bed assigned successfully."));
});

const bedTransferSchema = bedAssignmentSchema.extend({ targetBedId: uuidSchema });

export const transferAdmissionBed = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId, userId } = tenantContext(req);
  const admissionId = paramUuid(req, "admissionId");
  const input = parseBody(bedTransferSchema, req.body);
  if (input.bedId === input.targetBedId) throw new ApiError(400, "Choose a different bed for transfer.");
  const result = await withDbConflictHandling(db.$transaction(async (tx) => {
    const admission = await tx.admission.findFirst({
      where: { id: admissionId, tenantId, status: "admitted" },
      include: { Encounter: { select: { id: true, patientId: true } } },
    });
    if (!admission) throw new ApiError(404, "Active admission not found.");
    const active = await tx.bedAssignment.findFirst({
      where: { admissionId, tenantId, bedId: input.bedId, releasedAt: null },
    });
    if (!active) throw new ApiError(404, "Active bed assignment not found.");
    const target = await tx.bed.findFirst({
      where: { id: input.targetBedId, tenantId, status: "available", currentPatientId: null },
      select: { id: true },
    });
    if (!target) throw new ApiError(409, "Target bed is unavailable.");
    const released = await tx.bedAssignment.updateMany({
      where: { id: active.id, tenantId, releasedAt: null },
      data: { releasedAt: new Date() },
    });
    if (!released.count) throw new ApiError(409, "Bed assignment changed; refresh and try again.");
    const oldBed = await tx.bed.updateMany({
      where: { id: input.bedId, tenantId, currentPatientId: admission.Encounter.patientId, status: "occupied" },
      data: { currentPatientId: null, status: "available", version: { increment: 1 } },
    });
    const newBed = await tx.bed.updateMany({
      where: { id: target.id, tenantId, currentPatientId: null, status: "available" },
      data: { currentPatientId: admission.Encounter.patientId, status: "occupied", version: { increment: 1 } },
    });
    if (!oldBed.count || !newBed.count) throw new ApiError(409, "Bed state changed during transfer; refresh and retry.");
    const assignment = await tx.bedAssignment.create({
      data: {
        tenantId,
        bedId: target.id,
        encounterId: admission.encounterId,
        admissionId,
        assignedBy: userId,
        reason: "transfer",
      },
      include: { Bed: true },
    });
    await writeAudit(tx, req, "transfer", "BedAssignment", assignment.id, {
      fromBedId: input.bedId,
      toBedId: target.id,
      admissionId,
    });
    return assignment;
  }, { isolationLevel: "Serializable" }));
  return res.status(201).json(new ApiResponse(201, result, "Bed transfer completed successfully."));
});

export const assignEncounterBed = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId, userId } = tenantContext(req);
  const encounterId = paramUuid(req, "encounterId");
  const input = parseBody(bedAssignmentSchema, req.body);
  const assignment = await withDbConflictHandling(db.$transaction(async (tx) => {
    const encounter = await tx.encounter.findFirst({
      where: { id: encounterId, tenantId, status: { not: "closed" } },
      select: { id: true, patientId: true, type: true, Admission: { select: { id: true } } },
    });
    if (!encounter) throw new ApiError(404, "Open encounter not found.");
    if (encounter.Admission || encounter.type !== "emergency") {
      throw new ApiError(409, "Use the active admission workflow to assign an inpatient bed.");
    }
    const bed = await tx.bed.findFirst({
      where: { id: input.bedId, tenantId, status: "available", currentPatientId: null },
      select: { id: true },
    });
    if (!bed) throw new ApiError(409, "Bed is unavailable.");
    const claimed = await tx.bed.updateMany({
      where: { id: bed.id, tenantId, status: "available", currentPatientId: null },
      data: { status: "occupied", currentPatientId: encounter.patientId, version: { increment: 1 } },
    });
    if (!claimed.count) throw new ApiError(409, "Bed was assigned by another user; refresh and try again.");
    const created = await tx.bedAssignment.create({
      data: { tenantId, bedId: bed.id, encounterId, assignedBy: userId, reason: input.reason },
      include: { Bed: true },
    });
    await writeAudit(tx, req, "assign", "BedAssignment", created.id, { bedId: bed.id, encounterId });
    return created;
  }));
  return res.status(201).json(new ApiResponse(201, assignment, "Encounter bed assigned successfully."));
});

export const releaseEncounterBed = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId } = tenantContext(req);
  const encounterId = paramUuid(req, "encounterId");
  const input = parseBody(z.object({ bedId: uuidSchema }), req.body);
  await withDbConflictHandling(db.$transaction(async (tx) => {
    const assignment = await tx.bedAssignment.findFirst({
      where: { encounterId, tenantId, bedId: input.bedId, releasedAt: null },
      include: { Encounter: { select: { patientId: true } }, Admission: { select: { id: true } } },
    });
    if (!assignment) throw new ApiError(404, "Active bed assignment not found.");
    if (assignment.Admission) {
      throw new ApiError(409, "Use the admission discharge or transfer workflow for this bed.");
    }
    const released = await tx.bedAssignment.updateMany({
      where: { id: assignment.id, tenantId, releasedAt: null },
      data: { releasedAt: new Date() },
    });
    const bed = await tx.bed.updateMany({
      where: {
        id: input.bedId,
        tenantId,
        status: "occupied",
        currentPatientId: assignment.Encounter.patientId,
      },
      data: { status: "available", currentPatientId: null, version: { increment: 1 } },
    });
    if (!released.count || !bed.count) throw new ApiError(409, "Bed state changed during release; refresh and try again.");
    await writeAudit(tx, req, "release", "BedAssignment", assignment.id, { bedId: input.bedId, encounterId });
  }));
  return res.status(200).json(new ApiResponse(200, {}, "Bed released successfully."));
});

export const transferEncounterBed = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId, userId } = tenantContext(req);
  const encounterId = paramUuid(req, "encounterId");
  const input = parseBody(bedTransferSchema, req.body);
  if (input.bedId === input.targetBedId) throw new ApiError(400, "Choose a different bed for transfer.");
  const assignment = await withDbConflictHandling(db.$transaction(async (tx) => {
    const encounter = await tx.encounter.findFirst({
      where: { id: encounterId, tenantId, status: { not: "closed" }, type: "emergency" },
      select: { id: true, patientId: true },
    });
    if (!encounter) throw new ApiError(404, "Open emergency encounter not found.");
    const active = await tx.bedAssignment.findFirst({
      where: { encounterId, tenantId, bedId: input.bedId, admissionId: null, releasedAt: null },
      select: { id: true },
    });
    if (!active) throw new ApiError(404, "Active emergency bed assignment not found.");
    const target = await tx.bed.findFirst({
      where: { id: input.targetBedId, tenantId, status: "available", currentPatientId: null },
      select: { id: true },
    });
    if (!target) throw new ApiError(409, "Target bed is unavailable.");
    const released = await tx.bedAssignment.updateMany({
      where: { id: active.id, releasedAt: null },
      data: { releasedAt: new Date() },
    });
    const oldBed = await tx.bed.updateMany({
      where: { id: input.bedId, tenantId, currentPatientId: encounter.patientId, status: "occupied" },
      data: { currentPatientId: null, status: "available", version: { increment: 1 } },
    });
    const newBed = await tx.bed.updateMany({
      where: { id: target.id, tenantId, currentPatientId: null, status: "available" },
      data: { currentPatientId: encounter.patientId, status: "occupied", version: { increment: 1 } },
    });
    if (!released.count || !oldBed.count || !newBed.count) {
      throw new ApiError(409, "Bed state changed during transfer; refresh and retry.");
    }
    const created = await tx.bedAssignment.create({
      data: {
        tenantId,
        bedId: target.id,
        encounterId,
        assignedBy: userId,
        reason: "transfer",
      },
      include: { Bed: true },
    });
    await writeAudit(tx, req, "transfer", "BedAssignment", created.id, {
      fromBedId: input.bedId,
      toBedId: target.id,
      encounterId,
    });
    return created;
  }));
  return res.status(201).json(new ApiResponse(201, assignment, "Emergency bed transfer completed successfully."));
});

export const listAvailableBeds = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId } = tenantContext(req);
  const beds = await db.bed.findMany({
    where: {
      tenantId,
      status: "available",
      BedAssignment: { none: { releasedAt: null } },
    },
    orderBy: [{ Room: { Ward: { name: "asc" } } }, { Room: { name: "asc" } }, { code: "asc" }],
    select: {
      id: true,
      code: true,
      status: true,
      roomId: true,
      tenantId: true,
      currentPatientId: true,
      version: true,
      Room: {
        select: {
          id: true,
          name: true,
          Ward: { select: { id: true, name: true } },
        },
      },
    },
  });
  return res.status(200).json(new ApiResponse(200, beds, "Available beds fetched successfully."));
});

const theatreSchema = z.object({ name: z.string().trim().min(1).max(120) });

export const listTheatres = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId } = tenantContext(req);
  const query = parseBody(z.object({
    includeInactive: z.preprocess((value) => value === true || value === "true", z.boolean()).default(false),
  }), req.query);
  const theatres = await db.operatingTheatre.findMany({
    where: { tenantId, ...(query.includeInactive ? {} : { isActive: true }) },
    orderBy: { name: "asc" },
  });
  return res.status(200).json(new ApiResponse(200, theatres, "Operating theatres fetched successfully."));
});

export const listSurgeryTeamOptions = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId } = tenantContext(req);
  const users = await db.user.findMany({
    where: {
      tenantId,
      isActive: true,
      OR: [
        { DoctorProfile: { is: { isActive: true } } },
        { StaffProfile: { is: { isActive: true } } },
      ],
    },
    select: { id: true, name: true, DoctorProfile: { select: { id: true } }, StaffProfile: { select: { id: true } } },
    orderBy: { name: "asc" },
  });
  return res.status(200).json(new ApiResponse(200, users, "Surgery team options fetched successfully."));
});

export const createTheatre = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId } = tenantContext(req);
  const input = parseBody(theatreSchema, req.body);
  const theatre = await withDbConflictHandling(db.$transaction(async (tx) => {
    const created = await tx.operatingTheatre.create({ data: { ...input, tenantId } });
    await writeAudit(tx, req, "create", "OperatingTheatre", created.id, { active: true });
    return created;
  }));
  return res.status(201).json(new ApiResponse(201, theatre, "Operating theatre created successfully."));
});

export const updateTheatre = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId } = tenantContext(req);
  const theatreId = paramUuid(req, "theatreId");
  const input = parseBody(z.object({
    name: z.string().trim().min(1).max(120).optional(),
    isActive: z.boolean().optional(),
  }).refine((value) => value.name !== undefined || value.isActive !== undefined), req.body);
  const theatre = await withDbConflictHandling(db.$transaction(async (tx) => {
    const result = await tx.operatingTheatre.updateMany({
      where: { id: theatreId, tenantId },
      data: input,
    });
    if (!result.count) throw new ApiError(404, "Operating theatre not found.");
    const updated = await tx.operatingTheatre.findFirst({ where: { id: theatreId, tenantId } });
    await writeAudit(tx, req, "update", "OperatingTheatre", theatreId, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    });
    return updated;
  }));
  return res.status(200).json(new ApiResponse(200, theatre, "Operating theatre updated successfully."));
});

export const listSurgeryCases = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId } = tenantContext(req);
  const filters = parseBody(z.object({
    status: surgeryStatusSchema.optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
  }), req.query);
  const where = { tenantId, ...(filters.status ? { status: filters.status } : {}) };
  const [items, total] = await Promise.all([
    db.surgeryCase.findMany({
      where,
      include: {
        Encounter: {
          select: {
            id: true,
            Patient: { select: { id: true, mrn: true, firstName: true, lastName: true } },
            Department: { select: { id: true, name: true } },
          },
        },
        OperatingTheatre: { select: { id: true, name: true } },
        Surgeon: { select: { id: true, User: { select: { id: true, name: true } } } },
        SurgeryTeamMember: { select: { id: true, role: true, userId: true, User: { select: { name: true } } } },
      },
      orderBy: [{ scheduledAt: "desc" }, { id: "asc" }],
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    }),
    db.surgeryCase.count({ where }),
  ]);
  return res.status(200).json(new ApiResponse(200, {
    items,
    pagination: { page: filters.page, limit: filters.limit, total, totalPages: Math.ceil(total / filters.limit) },
  }, "Surgery cases fetched successfully."));
});

const surgerySchema = z.object({
  procedureName: z.string().trim().min(1).max(200),
  scheduledAt: z.coerce.date(),
  durationMinutes: z.number().int().min(1).max(1440).default(60),
  theatreId: uuidSchema,
  surgeonId: uuidSchema,
  admissionId: uuidSchema.nullish(),
  anesthesiaType: z.enum(["general", "regional", "local", "sedation"]).nullish(),
  preOpNotes: z.string().trim().max(4000).nullish(),
  team: z.array(z.object({
    userId: uuidSchema,
    role: z.enum(["assistant_surgeon", "anesthetist", "scrub_nurse", "circulating_nurse"]),
  })).max(30).default([]).refine(
    (team) => new Set(team.map(({ userId }) => userId)).size === team.length,
    "A user can only be added once to a surgery team.",
  ),
});

export const createSurgeryCase = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId } = tenantContext(req);
  const encounterId = paramUuid(req, "encounterId");
  const input = parseBody(surgerySchema, req.body);
  const surgery = await withDbConflictHandling(db.$transaction(async (tx) => {
    const [encounter, theatre, surgeon] = await Promise.all([
      tx.encounter.findFirst({ where: { id: encounterId, tenantId, status: { not: "closed" } }, select: { id: true } }),
      tx.operatingTheatre.findFirst({ where: { id: input.theatreId, tenantId, isActive: true }, select: { id: true } }),
      tx.doctorProfile.findFirst({ where: { id: input.surgeonId, tenantId, isActive: true }, select: { id: true } }),
    ]);
    if (!encounter) throw new ApiError(404, "Open encounter not found.");
    if (!theatre) throw new ApiError(404, "Active operating theatre not found.");
    if (!surgeon) throw new ApiError(404, "Active surgeon not found.");
    if (input.admissionId) {
      const admission = await tx.admission.findFirst({
        where: { id: input.admissionId, tenantId, encounterId, status: "admitted" },
        select: { id: true },
      });
      if (!admission) throw new ApiError(404, "Active admission for this encounter not found.");
    }
    const users = await tx.user.findMany({
      where: { id: { in: input.team.map(({ userId }) => userId) }, tenantId, isActive: true },
      select: { id: true },
    });
    if (users.length !== new Set(input.team.map(({ userId }) => userId)).size) {
      throw new ApiError(400, "One or more surgery team members are inactive or outside this hospital.");
    }
    const created = await tx.surgeryCase.create({
      data: {
        tenantId,
        encounterId,
        procedureName: input.procedureName,
        scheduledAt: input.scheduledAt,
        durationMinutes: input.durationMinutes,
        theatreId: input.theatreId,
        surgeonId: input.surgeonId,
        admissionId: input.admissionId ?? null,
        anesthesiaType: input.anesthesiaType ?? null,
        preOpNotes: input.preOpNotes ?? null,
        SurgeryTeamMember: { create: input.team },
      },
      include: {
        OperatingTheatre: true,
        Surgeon: { include: { User: { select: { id: true, name: true } } } },
        SurgeryTeamMember: true,
      },
    });
    await writeAudit(tx, req, "create", "SurgeryCase", created.id, {
      encounterId,
      theatreId: input.theatreId,
      surgeonId: input.surgeonId,
    });
    return created;
  }, { isolationLevel: "Serializable" }));
  return res.status(201).json(new ApiResponse(201, surgery, "Surgery scheduled successfully."));
});

const updateSurgerySchema = z.object({
  status: surgeryStatusSchema.optional(),
  scheduledAt: z.coerce.date().optional(),
  version: z.number().int().positive(),
  outcomeNotes: z.string().trim().max(10000).nullish(),
}).refine((input) => input.status !== undefined || input.scheduledAt !== undefined || input.outcomeNotes !== undefined, {
  message: "Provide a surgery field to update.",
});

export const updateSurgeryCase = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId } = tenantContext(req);
  const surgeryId = paramUuid(req, "surgeryId");
  const input = parseBody(updateSurgerySchema, req.body);
  const result = await withDbConflictHandling(db.$transaction(async (tx) => {
    const current = await tx.surgeryCase.findFirst({ where: { id: surgeryId, tenantId } });
    if (!current) throw new ApiError(404, "Surgery case not found.");
    if (current.version !== input.version) throw new ApiError(409, "Surgery case changed; refresh and try again.");
    const nextStatus = input.status ?? current.status;
    const allowed: Record<string, string[]> = {
      scheduled: ["in_progress", "cancelled", "postponed"],
      in_progress: ["completed"],
      postponed: ["scheduled", "cancelled"],
      completed: [],
      cancelled: [],
    };
    if (input.status && input.status !== current.status && !allowed[current.status]?.includes(input.status)) {
      throw new ApiError(409, "Invalid surgery status transition.");
    }
    if (input.scheduledAt && !["scheduled", "postponed"].includes(current.status)) {
      throw new ApiError(409, "Only scheduled or postponed surgeries can be rescheduled.");
    }
    if (current.status === "postponed" && nextStatus === "scheduled" && !input.scheduledAt) {
      throw new ApiError(400, "Choose a new scheduled date and time when rescheduling.");
    }
    const updated = await tx.surgeryCase.updateMany({
      where: { id: surgeryId, tenantId, version: input.version },
      data: {
        ...(input.status ? { status: input.status } : {}),
        ...(input.scheduledAt ? { scheduledAt: input.scheduledAt } : {}),
        ...(input.outcomeNotes !== undefined ? { outcomeNotes: input.outcomeNotes } : {}),
        ...(nextStatus === "in_progress" && !current.startedAt ? { startedAt: new Date() } : {}),
        ...(nextStatus === "completed" ? { endedAt: new Date() } : {}),
        version: { increment: 1 },
      },
    });
    if (!updated.count) throw new ApiError(409, "Surgery case changed; refresh and try again.");
    const surgery = await tx.surgeryCase.findFirst({
      where: { id: surgeryId, tenantId },
      include: {
        OperatingTheatre: true,
        Surgeon: { include: { User: { select: { id: true, name: true } } } },
        SurgeryTeamMember: true,
      },
    });
    await writeAudit(tx, req, "update", "SurgeryCase", surgeryId, {
      status: nextStatus,
      ...(input.scheduledAt ? { scheduledAt: input.scheduledAt.toISOString() } : {}),
    });
    return surgery;
  }, { isolationLevel: "Serializable" }));
  return res.status(200).json(new ApiResponse(200, result, "Surgery case updated successfully."));
});

const dischargeSchema = z.object({
  dischargeType: z.enum(["routine", "against_medical_advice", "transferred", "deceased"]),
  finalDiagnosis: z.string().trim().max(4000).nullish(),
  proceduresPerformed: z.string().trim().max(4000).nullish(),
  courseInHospital: z.string().trim().max(10000).nullish(),
  conditionAtDischarge: z.string().trim().max(4000).nullish(),
  followUpInstructions: z.string().trim().max(4000).nullish(),
  followUpDate: z.coerce.date().nullish(),
});

export const dischargeAdmission = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId, userId } = tenantContext(req);
  const admissionId = paramUuid(req, "admissionId");
  const input = parseBody(dischargeSchema, req.body);
  const doctor = await currentDoctor(userId, tenantId);
  const summary = await withDbConflictHandling(db.$transaction(async (tx) => {
    const admission = await tx.admission.findFirst({
      where: { id: admissionId, tenantId, status: "admitted" },
      include: { Encounter: { select: { id: true, patientId: true, appointmentId: true } } },
    });
    if (!admission) throw new ApiError(404, "Active admission not found.");
    const activeSurgery = await tx.surgeryCase.findFirst({
      where: { encounterId: admission.encounterId, tenantId, status: { in: ["scheduled", "in_progress"] } },
      select: { id: true },
    });
    if (activeSurgery) throw new ApiError(409, "Complete any active surgery or cancel/postpone scheduled surgery before discharge.");
    const dischargedAt = new Date();
    const activeAssignments = await tx.bedAssignment.findMany({
      where: { admissionId, tenantId, releasedAt: null },
      select: { id: true, bedId: true },
    });
    for (const assignment of activeAssignments) {
      const released = await tx.bedAssignment.updateMany({
        where: { id: assignment.id, releasedAt: null },
        data: { releasedAt: dischargedAt },
      });
      const bedUpdated = await tx.bed.updateMany({
        where: { id: assignment.bedId, tenantId, currentPatientId: admission.Encounter.patientId },
        data: { currentPatientId: null, status: "available", version: { increment: 1 } },
      });
      if (!released.count || !bedUpdated.count) {
        throw new ApiError(409, "Bed assignment changed during discharge; refresh and retry.");
      }
    }
    await tx.admission.update({
      where: { id: admissionId },
      data: { status: "discharged", dischargedAt, dischargeType: input.dischargeType, version: { increment: 1 } },
    });
    await tx.encounter.update({
      where: { id: admission.encounterId },
      data: {
        status: "closed",
        disposition:
          input.dischargeType === "transferred" || input.dischargeType === "deceased"
            ? input.dischargeType
            : "discharged_home",
        endedAt: dischargedAt,
        version: { increment: 1 },
      },
    });
    if (admission.Encounter.appointmentId) {
      await tx.appointment.updateMany({
        where: { id: admission.Encounter.appointmentId, tenantId, status: "booked" },
        data: { status: "completed", updatedBy: userId, version: { increment: 1 } },
      });
    }
    const summary = await tx.dischargeSummary.create({
      data: {
        tenantId,
        admissionId,
        doctorId: doctor.id,
        finalDiagnosis: input.finalDiagnosis ?? null,
        proceduresPerformed: input.proceduresPerformed ?? null,
        courseInHospital: input.courseInHospital ?? null,
        conditionAtDischarge: input.conditionAtDischarge ?? null,
        followUpInstructions: input.followUpInstructions ?? null,
        followUpDate: input.followUpDate ?? null,
      },
    });
    await writeAudit(tx, req, "discharge", "Admission", admissionId, {
      dischargeType: input.dischargeType,
      doctorId: doctor.id,
    });
    return summary;
  }, { isolationLevel: "Serializable" }));
  return res.status(201).json(new ApiResponse(201, summary, "Patient discharged successfully."));
});
