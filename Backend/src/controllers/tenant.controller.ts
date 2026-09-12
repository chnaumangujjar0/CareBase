import type { Request, Response } from "express";
import type { Char } from "@prisma/orm-postgres/target/codec-types";
import { db } from "../prisma/db";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { ApiResponse } from "../utils/apiResponse";
import { uploadToCloudinary } from "../utils/cloudinary";
import {
  completeOnboardingSchema,
  emptyOptionalFields,
  OWNER_PERMISSIONS,
  SAFE_USER_FIELDS,
  slugifyTenantName,
} from "../utils/tenant.utils";

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

    const result = await db.transaction(async (trx) => {
      const user = await trx.orm.public.User.where({ id: userId as Char<36> }).first();

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

      const tenant = await trx.orm.public.Tenant.create({
        name: tenantName,
        slug,
        logo,
        favicon,
        ...emptyOptionalFields({ tenantName, ...location }),
      });

      const ownerRole = await trx.orm.public.Role.create({
        tenantId: tenant.id,
        name: `Owner-${tenant.id.slice(0, 8)}`,
        permissions: [...OWNER_PERMISSIONS],
      });

      await trx.orm.public.User.where({ id: user.id }).update({
        tenantId: tenant.id,
        roleId: ownerRole.id,
      });

      const safeUser = await trx.orm.public.User.where({ id: user.id })
        .select(...SAFE_USER_FIELDS)
        .first();

      if (!safeUser) {
        throw new ApiError(500, "Unable to retrieve the onboarded user");
      }

      return { user: safeUser, tenant };
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