import type { Request, Response } from "express";
import { z } from "zod";
import { db } from "../db/index.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const genderSchema = z.enum(["male", "female", "other"]);

const patientFieldsSchema = z.object({
  mrn: z.string().trim().min(1).max(64),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  dob: z.coerce.date(),
  gender: genderSchema.nullish(),
  address: z.string().trim().max(1000).nullish(),
  contactEmail: z.email().trim().toLowerCase().nullish(),
  contactPhone: z.string().trim().max(32),
  emergencyContactName: z.string().trim().max(160).nullish(),
  emergencyContactPhone: z.string().trim().max(32).nullish(),
  insuranceProvider: z.string().trim().max(160).nullish(),
  insurancePolicyNumber: z.string().trim().max(120).nullish(),
});

const createPatientSchema = patientFieldsSchema.extend({
  isActive: z.boolean().default(true),
}).refine((patient) => patient.dob <= new Date(), {
  message: "Date of birth cannot be in the future",
  path: ["dob"],
});

const updatePatientSchema = patientFieldsSchema.partial().extend({
  isActive: z.boolean().optional(),
}).refine((patient) => Object.keys(patient).length > 0, {
  message: "At least one patient field is required",
}).refine((patient) => patient.dob === undefined || patient.dob <= new Date(), {
  message: "Date of birth cannot be in the future",
  path: ["dob"],
});

const createPatientMedicalDataSchema = z.object({
  recordedAt: z.coerce.date().optional(),
  heartRate: z.number().int().min(20).max(300).optional(),
  totalCholesterol: z.number().int().min(0).max(1000).optional(),
  hemoglobin: z.number().min(0).max(40).optional(),
  systolicBloodPressure: z.number().int().min(40).max(300).optional(),
  diastolicBloodPressure: z.number().int().min(20).max(200).optional(),
  bloodGlucose: z.number().int().min(0).max(2000).optional(),
  whiteBloodCellCount: z.number().int().min(0).max(1000000).optional(),
  bodyMassIndex: z.number().min(0).max(100).optional(),
  respiratoryRate: z.number().int().min(1).max(100).optional(),
  plateletCount: z.number().int().min(0).max(2000000).optional(),
  allergies: z.string().trim().max(2000).nullish(),
  chronicConditions: z.string().trim().max(2000).nullish(),
  pastSurgeries: z.string().trim().max(2000).nullish(),
  note: z.string().trim().max(4000).nullish(),
}).refine((data) =>
  data.systolicBloodPressure === undefined === (data.diastolicBloodPressure === undefined), {
  message: "Enter both systolic and diastolic blood pressure",
  path: ["diastolicBloodPressure"],
}).refine((data) =>
  Object.entries(data).some(([key, value]) => key !== "recordedAt" && value !== undefined && value !== null && value !== ""), {
  message: "At least one medical measurement or note is required",
});

const patientIdFromRequest = (req: Request) => {
  const parsed = z.uuid().safeParse(req.params.patientId);
  if (!parsed.success) throw new ApiError(400, "A valid patient ID is required");
  return parsed.data;
};

export const getPatients = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) throw new ApiError(401, "Authenticated tenant context is required");

  const querySchema = z.object({
    search: z.string().trim().max(100).optional(),
    isActive: z.enum(["true", "false"]).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
  });
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new ApiError(
      400,
      "Invalid patient filters",
      parsed.error.issues.map(({ path, message }) => ({ path: path.join("."), message })),
    );
  }

  const { search, isActive, page, limit } = parsed.data;
  const where = {
    tenantId,
    deletedAt: null,
    ...(isActive ? { isActive: isActive === "true" } : {}),
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
            { mrn: { contains: search, mode: "insensitive" as const } },
            { contactPhone: { contains: search, mode: "insensitive" as const } },
            { contactEmail: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    db.patient.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.patient.count({ where }),
  ]);

  return res.status(200).json(
    new ApiResponse(200, { items, total, page, limit, totalPages: Math.ceil(total / limit) }, "Patients fetched successfully"),
  );
});

export const createPatient = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) throw new ApiError(401, "Authenticated tenant context is required");

  const parsed = createPatientSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(
      400,
      "Invalid patient details",
      parsed.error.issues.map(({ path, message }) => ({ path: path.join("."), message })),
    );
  }

  try {
    const patient = await db.patient.create({ data: { ...parsed.data, tenantId } });
    return res.status(201).json(new ApiResponse(201, patient, "Patient created successfully"));
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      throw new ApiError(409, "A patient with this MRN already exists in this tenant");
    }
    throw error;
  }
});

export const getPatientById = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) throw new ApiError(401, "Authenticated tenant context is required");
  const patientId = patientIdFromRequest(req);

  const patient = await db.patient.findFirst({
    where: { id: patientId, tenantId, deletedAt: null },
    include: {
      MedicalData: { orderBy: { recordedAt: "desc" }, take: 20 },
      Appointment: {
        where: { status: "booked", scheduledAt: { gte: new Date() } },
        orderBy: { scheduledAt: "asc" },
        take: 3,
        include: {
          DoctorProfile: {
            select: {
              designation: true,
              specialization: true,
              User: { select: { name: true } },
            },
          },
          Department: { select: { name: true } },
        },
      },
    },
  });
  if (!patient) throw new ApiError(404, "Patient not found");

  return res.status(200).json(new ApiResponse(200, patient, "Patient fetched successfully"));
});

export const createPatientMedicalData = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) throw new ApiError(401, "Authenticated tenant context is required");
  const patientId = patientIdFromRequest(req);

  const parsed = createPatientMedicalDataSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(
      400,
      "Invalid medical measurements",
      parsed.error.issues.map(({ path, message }) => ({ path: path.join("."), message })),
    );
  }

  const patient = await db.patient.findFirst({
    where: { id: patientId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!patient) throw new ApiError(404, "Patient not found");

  const medicalData = await db.patientMedicalData.create({
    data: {
      ...parsed.data,
      patientId,
      tenantId,
      recordedBy: req.user?.id,
    },
  });

  return res.status(201).json(
    new ApiResponse(201, medicalData, "Patient medical data recorded successfully"),
  );
});

export const updatePatient = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) throw new ApiError(401, "Authenticated tenant context is required");
  const patientId = patientIdFromRequest(req);

  const parsed = updatePatientSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(
      400,
      "Invalid patient update",
      parsed.error.issues.map(({ path, message }) => ({ path: path.join("."), message })),
    );
  }

  try {
    const updated = await db.patient.updateMany({
      where: { id: patientId, tenantId, deletedAt: null },
      data: parsed.data,
    });
    if (updated.count === 0) throw new ApiError(404, "Patient not found");

    const patient = await db.patient.findFirst({ where: { id: patientId, tenantId } });
    return res.status(200).json(new ApiResponse(200, patient, "Patient updated successfully"));
  } catch (error: unknown) {
    if (error instanceof ApiError) throw error;
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      throw new ApiError(409, "A patient with this MRN already exists in this tenant");
    }
    throw error;
  }
});

export const deletePatient = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) throw new ApiError(401, "Authenticated tenant context is required");
  const patientId = patientIdFromRequest(req);

  const result = await db.patient.updateMany({
    where: { id: patientId, tenantId, deletedAt: null },
    data: { deletedAt: new Date(), isActive: false },
  });
  if (result.count === 0) throw new ApiError(404, "Patient not found");

  return res.status(200).json(new ApiResponse(200, { id: patientId }, "Patient archived successfully"));
});