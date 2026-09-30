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
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      favicon: true,
      address: true,
      city: true,
      state: true,
      country: true,
      postalCode: true,
    },
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