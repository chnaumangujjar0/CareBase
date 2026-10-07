import type { Request, Response } from "express";
import { db } from "../db/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import {
  completeOnboardingSchema,
  emptyOptionalFields,
  OWNER_PERMISSIONS,
  SAFE_USER_SELECT,
  slugifyTenantName,
} from "../utils/tenant.utils.js";
import { char36Schema } from "../types/tenant.types.js";
import type { Tenant } from "../types/tenant.types.js";
import z from "zod";
type AuthenticatedRequest = Request & {
  user?: Request["user"] & { id: string };
};

export const completeOnboarding = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, "Authentication required");
    }

    const parsedBody = completeOnboardingSchema.safeParse(req.body);
    if (!parsedBody.success) {
      const message = parsedBody.error.issues[0]?.message ?? "Invalid request body";
      throw new ApiError(400, message);
    }
    const { tenantName, ...location } = parsedBody.data;

    const files = req.files as
      | { [fieldname: string]: Express.Multer.File[] }
      | undefined;
    const logoLocalPath = files?.logo?.[0]?.path;
    const faviconLocalPath = files?.favicon?.[0]?.path;

    let logo = "";
    if (logoLocalPath) {
      const logoUpload = await uploadToCloudinary(logoLocalPath);
      if (!logoUpload) {
        throw new ApiError(500, "Failed to upload hospital logo");
      }
      logo = logoUpload.secure_url;
    }

    let favicon = "";
    if (faviconLocalPath) {
      const faviconUpload = await uploadToCloudinary(faviconLocalPath);
      if (!faviconUpload) {
        throw new ApiError(500, "Failed to upload hospital favicon");
      }
      favicon = faviconUpload.secure_url;
    }

    const result = await db.$transaction(async (trx) => {
      const user = await trx.user.findUnique({ where: { id: userId } });

      if (!user) {
        throw new ApiError(404, "User not found");
      }

      if (user.tenantId) {
        throw new ApiError(
          409,
          "You have already completed onboarding for a hospital."
        );
      }

      const slug = slugifyTenantName(tenantName, userId);

      const tenant = await trx.tenant.create({
        data: {
          name: tenantName,
          slug,
          logo,
          favicon,
          ...emptyOptionalFields({ tenantName, ...location }),
        },
      });

      const ownerRole = await trx.role.create({
        data: {
          tenantId: tenant.id,
          name: `Owner`,
          permissions: [...OWNER_PERMISSIONS],
        },
      });

      await trx.user.update({
        where: { id: user.id },
        data: { tenantId: tenant.id, roleId: ownerRole.id },
      });

      const safeUser = await trx.user.findUnique({
        where: { id: user.id },
        select: SAFE_USER_SELECT,
      });

        
      if (!safeUser) {
        throw new ApiError(500, "Unable to retrieve the onboarded user");
      }
      return { user: { ...safeUser, role: ownerRole.name }, tenant };
    });

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          result,
          "Hospital onboarding completed successfully."
        )
      );
  }
);

export const getTenantById = asyncHandler(async (req:Request,res:Response) => {
  const rawTenantId = Array.isArray(req.params.tenantId)
    ? req.params.tenantId[0]
    : req.params.tenantId;
  const parsedTenantId = char36Schema.safeParse(rawTenantId);
  if (!parsedTenantId.success) {
    throw new ApiError(400, "A valid tenant id is required");
  }

  const tenant = await db.tenant.findUnique({
    where: { id: parsedTenantId.data },
  });

  if(!tenant) {
    throw new ApiError(400,"Tenent does not exist.")
  }

  const tenantResponse: Tenant = tenant;
  res.status(200).json(
    new ApiResponse<Tenant>(
      200,
      tenantResponse,
      "Tenent fetched Successfully!"
    )
  )
})

const updateTenantSchema = z.object({
  name: z
    .string()
    .min(2, "Hospital name must be at least 2 characters")
    .trim()
    .optional(),
  address: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  state: z.string().trim().optional().nullable(),
  country: z.string().trim().optional(),
  postalCode: z.string().trim().optional().nullable(),
});

export const updateTenantDetails = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId; 

    if (!userId) {
      throw new ApiError(401, "Authentication required");
    }

    if (!tenantId) {
      throw new ApiError(403, "No hospital associated with this account");
    }

    // Assuming you have an update schema (e.g., updateTenantSchema) that makes fields optional
    const parsedBody = updateTenantSchema.safeParse(req.body);
    if (!parsedBody.success) {
      const message = parsedBody.error.issues[0]?.message ?? "Invalid request body";
      throw new ApiError(400, message);
    }

    const { name, address, city, state, country, postalCode } = parsedBody.data;

    const files = req.files as
      | { [fieldname: string]: Express.Multer.File[] }
      | undefined;
    const logoLocalPath = files?.logo?.[0]?.path;
    const faviconLocalPath = files?.favicon?.[0]?.path;

    // Build the update payload dynamically. 
    // In Prisma, passing `undefined` ignores the field, while `null` sets it to null.
    const updateData: any = {
      ...(name && { name }),
      ...(address !== undefined && { address }),
      ...(city !== undefined && { city }),
      ...(state !== undefined && { state }),
      ...(country !== undefined && { country }),
      ...(postalCode !== undefined && { postalCode }),
    };

    if (logoLocalPath) {
      const logoUpload = await uploadToCloudinary(logoLocalPath);
      if (!logoUpload) {
        throw new ApiError(500, "Failed to upload new hospital logo");
      }
      updateData.logo = logoUpload.secure_url;
    }

    if (faviconLocalPath) {
      const faviconUpload = await uploadToCloudinary(faviconLocalPath);
      if (!faviconUpload) {
        throw new ApiError(500, "Failed to upload new hospital favicon");
      }
      updateData.favicon = faviconUpload.secure_url;
    }

    // Ensure there is actually something to update to avoid empty database calls
    if (Object.keys(updateData).length === 0) {
      throw new ApiError(400, "No valid fields provided for update");
    }

    const updatedTenant = await db.tenant.update({
      where: { id: tenantId },
      data: updateData,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedTenant,
          "Hospital details updated successfully."
        )
      );
  }
);