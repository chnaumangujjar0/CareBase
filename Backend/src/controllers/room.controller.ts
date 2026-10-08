import type { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { ApiResponse } from "../utils/apiResponse";
import {
  buildPagination,
  idParamSchema,
  isForeignKeyViolation,
  isUniqueViolation,
  paginationSchema,
  parseOrThrow,
  uuidSchema,
} from "../utils/facility.utils";
import { db } from "../db";

const roomNameSchema = z
  .string()
  .trim()
  .min(1, "Room name is required")
  .max(50, "Room name is too long");

const createRoomSchema = z.object({
  name: roomNameSchema,
  wardId: uuidSchema,
});

const updateRoomSchema = z
  .object({
    name: roomNameSchema.optional(),
    // Lets a room be moved to a different ward.
    wardId: uuidSchema.optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Provide at least one field to update.",
  });

const listRoomsQuerySchema = paginationSchema.extend({
  wardId: uuidSchema.optional(),
  search: z.string().trim().min(1).max(50).optional(),
});

const assertWardInTenant = async (wardId: string, tenantId: string) => {
  const ward = await db.ward.findFirst({
    where: { id: wardId, tenantId },
    select: { id: true },
  });
  if (!ward) {
    throw new ApiError(404, "Ward not found.");
  }
};

export const createRoom = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId as string;
  const { name, wardId } = parseOrThrow(createRoomSchema, req.body);

  await assertWardInTenant(wardId, tenantId);

  try {
    const room = await db.room.create({ data: { name, wardId, tenantId } });
    return res
      .status(201)
      .json(new ApiResponse(201, room, "Room created successfully."));
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ApiError(409, "A room with this name already exists in this ward.");
    }
    throw error;
  }
});

export const listRooms = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId as string;
  const { page, limit, wardId, search } = parseOrThrow(
    listRoomsQuerySchema,
    req.query
  );

  const where = {
    tenantId,
    ...(wardId ? { wardId } : {}),
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const [items, total] = await Promise.all([
    db.room.findMany({
      where,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        Ward: { select: { id: true, name: true } },
        _count: { select: { Bed: true } },
      },
    }),
    db.room.count({ where }),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      { items, pagination: buildPagination(page, limit, total) },
      "Rooms fetched successfully."
    )
  );
});

export const getRoom = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId as string;
  const { id } = parseOrThrow(idParamSchema, req.params);

  const room = await db.room.findFirst({
    where: { id, tenantId },
    include: {
      Ward: { select: { id: true, name: true } },
      Bed: {
        orderBy: { code: "asc" },
        // currentPatientId only - patient details are PHI and belong
        // behind the patient endpoints' own access checks.
        select: { id: true, code: true, status: true, version: true, currentPatientId: true },
      },
    },
  });

  if (!room) {
    throw new ApiError(404, "Room not found.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, room, "Room fetched successfully."));
});

export const updateRoom = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId as string;
  const { id } = parseOrThrow(idParamSchema, req.params);
  const data = parseOrThrow(updateRoomSchema, req.body);

  if (data.wardId) {
    await assertWardInTenant(data.wardId, tenantId);
  }

  try {
    const { count } = await db.room.updateMany({
      where: { id, tenantId },
      data,
    });

    if (count === 0) {
      throw new ApiError(404, "Room not found.");
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ApiError(409, "A room with this name already exists in this ward.");
    }
    throw error;
  }

  const room = await db.room.findFirst({ where: { id, tenantId } });
  return res
    .status(200)
    .json(new ApiResponse(200, room, "Room updated successfully."));
});

export const deleteRoom = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId as string;
  const { id } = parseOrThrow(idParamSchema, req.params);

  const room = await db.room.findFirst({
    where: { id, tenantId },
    select: { id: true, _count: { select: { Bed: true } } },
  });

  if (!room) {
    throw new ApiError(404, "Room not found.");
  }

  const bedCount = room._count.Bed;
  if (bedCount > 0) {
    // Bed.roomId is required in your schema, so beds can't be "unattached"
    // - they can only be moved to another room or deleted. The message
    // says exactly that (updateBed accepts a new roomId for moving).
    throw new ApiError(
      409,
      `This room still has ${bedCount} bed${bedCount === 1 ? "" : "s"}. ` +
        "Move them to another room or delete them first, then try again."
    );
  }

  try {
    await db.room.deleteMany({ where: { id, tenantId } });
  } catch (error) {
    // With Bed.Room set to onDelete: Restrict, this also catches a bed
    // created between the check above and this delete.
    if (isForeignKeyViolation(error)) {
      throw new ApiError(
        409,
        "This room still has beds attached. Move or delete them first, then try again."
      );
    }
    throw error;
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Room deleted successfully."));
});