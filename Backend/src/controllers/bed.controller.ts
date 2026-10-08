import type { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { ApiResponse } from "../utils/apiResponse";
import {
  BED_STATUSES,
  MANUAL_BED_STATUSES,
  buildPagination,
  idParamSchema,
  isForeignKeyViolation,
  isUniqueViolation,
  paginationSchema,
  parseOrThrow,
  uuidSchema,
} from "../utils/facility.utils";
import { db } from "../db";

const bedCodeSchema = z
  .string()
  .trim()
  .min(1, "Bed code is required")
  .max(30, "Bed code is too long");

const createBedSchema = z.object({
  code: bedCodeSchema,
  roomId: uuidSchema,
  status: z.enum(MANUAL_BED_STATUSES).default("available"),
});

const updateBedSchema = z
  .object({
    version: z.number().int().min(1, "A valid bed version is required."),
    code: bedCodeSchema.optional(),
    roomId: uuidSchema.optional(),
    status: z.enum(MANUAL_BED_STATUSES).optional(),
  })
  .refine(
    (data) =>
      data.code !== undefined ||
      data.roomId !== undefined ||
      data.status !== undefined,
    { message: "Provide at least one field to update." }
  );

const listBedsQuerySchema = paginationSchema.extend({
  roomId: uuidSchema.optional(),
  wardId: uuidSchema.optional(),
  status: z.enum(BED_STATUSES).optional(),
  search: z.string().trim().min(1).max(30).optional(),
});

const assertRoomInTenant = async (roomId: string, tenantId: string) => {
  const room = await db.room.findFirst({
    where: { id: roomId, tenantId },
    select: { id: true },
  });
  if (!room) {
    throw new ApiError(404, "Room not found.");
  }
};

export const createBed = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId as string;
  const { code, roomId, status } = parseOrThrow(createBedSchema, req.body);

  await assertRoomInTenant(roomId, tenantId);

  try {
    const bed = await db.bed.create({ data: { code, roomId, tenantId, status } });
    return res
      .status(201)
      .json(new ApiResponse(201, bed, "Bed created successfully."));
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ApiError(409, "A bed with this code already exists in this room.");
    }
    throw error;
  }
});

export const listBeds = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId as string;
  const { page, limit, roomId, wardId, status, search } = parseOrThrow(
    listBedsQuerySchema,
    req.query
  );

  const where = {
    tenantId,
    ...(roomId ? { roomId } : {}),
    ...(wardId ? { Room: { wardId } } : {}),
    ...(status ? { status } : {}),
    ...(search ? { code: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const [items, total] = await Promise.all([
    db.bed.findMany({
      where,
      orderBy: [{ code: "asc" }, { id: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: { Room: { select: { id: true, name: true, wardId: true } } },
    }),
    db.bed.count({ where }),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      { items, pagination: buildPagination(page, limit, total) },
      "Beds fetched successfully."
    )
  );
});

export const getBed = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId as string;
  const { id } = parseOrThrow(idParamSchema, req.params);

  const bed = await db.bed.findFirst({
    where: { id, tenantId },
    include: {
      Room: {
        select: {
          id: true,
          name: true,
          wardId: true,
          Ward: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!bed) {
    throw new ApiError(404, "Bed not found.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, bed, "Bed fetched successfully."));
});

export const updateBed = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId as string;
  const { id } = parseOrThrow(idParamSchema, req.params);
  const { version, ...changes } = parseOrThrow(updateBedSchema, req.body);

  const bed = await db.bed.findFirst({ where: { id, tenantId } });
  if (!bed) {
    throw new ApiError(404, "Bed not found.");
  }

  // Early check purely for a clear message. The write below re-checks
  // the version atomically, so this isn't what guarantees correctness.
  if (bed.version !== version) {
    throw new ApiError(
      409,
      "This bed was modified by someone else. Refresh and try again."
    );
  }

  const changesRoom = changes.roomId !== undefined && changes.roomId !== bed.roomId;
  const changesStatus = changes.status !== undefined && changes.status !== bed.status;

  // An occupied bed can't be moved or have its status overridden - the
  // patient has to be discharged or transferred first.
  if (bed.currentPatientId && (changesRoom || changesStatus)) {
    throw new ApiError(
      409,
      "This bed is currently occupied. Discharge or transfer the patient before changing its room or status."
    );
  }

  if (changesRoom && changes.roomId) {
    await assertRoomInTenant(changes.roomId, tenantId);
  }

  try {
    // The version in the WHERE clause is the real concurrency guard: if
    // anything changed the bed since we read it, zero rows match.
    // ASSUMPTION: every other code path that mutates a bed (patient
    // assignment, discharge) also bumps `version` the same way - otherwise
    // this guard has gaps.
    const { count } = await db.bed.updateMany({
      where: { id, tenantId, version },
      data: { ...changes, version: { increment: 1 } },
    });

    if (count === 0) {
      throw new ApiError(
        409,
        "This bed was modified or removed by someone else. Refresh and try again."
      );
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ApiError(409, "A bed with this code already exists in this room.");
    }
    throw error;
  }

  const updated = await db.bed.findFirst({ where: { id, tenantId } });
  return res
    .status(200)
    .json(new ApiResponse(200, updated, "Bed updated successfully."));
});

export const deleteBed = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId as string;
  const { id } = parseOrThrow(idParamSchema, req.params);

  const bed = await db.bed.findFirst({
    where: { id, tenantId },
    select: { id: true, currentPatientId: true },
  });

  if (!bed) {
    throw new ApiError(404, "Bed not found.");
  }

  if (bed.currentPatientId) {
    throw new ApiError(
      409,
      "This bed is currently occupied. Discharge or transfer the patient before deleting it."
    );
  }

  try {
    // currentPatientId: null in the WHERE makes the "not occupied" check
    // atomic with the delete itself, so a patient assigned in the instant
    // after the check above can't have their bed deleted underneath them.
    const { count } = await db.bed.deleteMany({
      where: { id, tenantId, currentPatientId: null },
    });

    if (count === 0) {
      throw new ApiError(
        409,
        "This bed's state changed (it may have just been occupied or already deleted). Refresh and try again."
      );
    }
  } catch (error) {
    // Covers any other table that references Bed (e.g. admission history).
    if (isForeignKeyViolation(error)) {
      throw new ApiError(
        409,
        "This bed is still referenced by other records and can't be deleted."
      );
    }
    throw error;
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Bed deleted successfully."));
});