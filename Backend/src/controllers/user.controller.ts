import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { db } from "../db/index.js";
import bcrypt from "bcrypt"
import { getRequestMeta } from "../utils/device.utils.js";
import { generateAccessAndRefreshToken, verifySessionFromRefreshToken,revokeSessionByRefreshToken } from "../utils/token.utils.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { SAFE_USER_SELECT } from "../utils/tenant.utils.js";
import jwt from "jsonwebtoken";
import { writeAuditLog } from "../utils/audit.utils.js";
import { getEffectiveRolePermissions } from "../constants/roles.js";
import { isConfiguredSuperAdmin } from "../utils/superAdmin.utils.js";
import { verifyRecaptcha } from "../utils/verifyRecaptcha.js";
import { createHash, randomBytes } from "node:crypto";
import { sendPasswordResetEmail } from "../services/staff-credentials-email.service.js";
const options = {
  httpOnly: true,
  secure: true,
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 12;
const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;
const PASSWORD_RESET_TTL_MINUTES = 30;
const hashResetToken = (token: string) => createHash("sha256").update(token).digest("hex");
const resetUrl = (token: string) => {
  const base = process.env.FRONTEND_URL?.trim();
  if (!base) throw new ApiError(500, "FRONTEND_URL is not configured");
  return new URL(`/reset-password?token=${encodeURIComponent(token)}`, base).toString();
};

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const email = typeof req.body?.email === "string" ? req.body.email.toLowerCase().trim() : "";
  if (!EMAIL_REGEX.test(email)) throw new ApiError(400, "Please enter a valid email address");

  const user = await db.user.findUnique({ where: { email }, select: { id: true, name: true, email: true, isActive: true } });
  if (user?.isActive) {
    const rawToken = randomBytes(32).toString("base64url");
    await db.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await db.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashResetToken(rawToken),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      },
    });
    const result = await sendPasswordResetEmail({
      name: user.name,
      email: user.email,
      resetUrl: resetUrl(rawToken),
      expiresInMinutes: PASSWORD_RESET_TTL_MINUTES,
    });
    if (!result.sent) console.error("Password reset email delivery failed", result.reason);
  }

  return res.status(202).json(new ApiResponse(202, null, "If an active account exists, a password reset link has been sent."));
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const token = typeof req.body?.token === "string" ? req.body.token : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!token || password.length < MIN_PASSWORD_LENGTH) {
    throw new ApiError(400, `A valid reset token and password of at least ${MIN_PASSWORD_LENGTH} characters are required`);
  }

  const resetToken = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
  });
  if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date()) {
    throw new ApiError(400, "This password reset link is invalid or expired");
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const now = new Date();
  await db.$transaction(async (transaction) => {
    const consumed = await transaction.passwordResetToken.updateMany({
      where: {
        id: resetToken.id,
        usedAt: null,
        expiresAt: { gt: now },
      },
      data: { usedAt: now },
    });
    if (consumed.count !== 1) {
      throw new ApiError(400, "This password reset link is invalid or expired");
    }
    await transaction.user.update({ where: { id: resetToken.userId }, data: { passwordHash } });
    await transaction.session.updateMany({
      where: { userId: resetToken.userId, revokedAt: null },
      data: { revokedAt: now },
    });
  });
  return res.status(200).json(new ApiResponse(200, null, "Password reset successfully. Please sign in."));
});

 export const registerOwner = asyncHandler(async (req: Request, res: Response) => {
  await verifyRecaptcha(req.body?.recaptchaToken, "signup");
  const { name, email, password } = req.body;
  
  if (
    [name, email, password].some(
      (val) => !val || typeof val !== "string" || !val.trim()
    )
  ) {
    throw new ApiError(400, "Name, email, and password are required");
  }
 
  if (!EMAIL_REGEX.test(email.trim())) {
    throw new ApiError(400, "Please enter a valid email address");
  }
 
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new ApiError(
      400,
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
    );
  }
 
  const normalizedEmail = email.toLowerCase().trim();
 
  const existingUser = await db.user.findUnique({ where: { email: normalizedEmail } });
 
  if (existingUser) {
    throw new ApiError(409, "User with this email already exists");
  }
 
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
 
  let newUser;
  try {
    newUser = await db.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        isSuperAdmin: false,
        isActive: true,
      },
    });
  } catch (error: any) {
    if (error?.code === "P2002") {
      throw new ApiError(409, "User with this email already exists");
    }
    throw error;
  }
 
  const { userAgent, ipAddress } = getRequestMeta(req);
  const tokens = await generateAccessAndRefreshToken(newUser.id, {
    userAgent: userAgent ?? undefined,
    ipAddress: ipAddress ?? undefined,
  });
 
  const safeUser = await db.user.findUnique({
    where: { id: newUser.id },
    select: SAFE_USER_SELECT,
  });
  await writeAuditLog(req, {
    action: "register",
    entityType: "User",
    entityId: newUser.id,
    userId: newUser.id,
    newValue: { isSuperAdmin: false },
  });
 
  return res.status(201).json(
    new ApiResponse(
      201,
      { user: safeUser, ...tokens },
      "Account created successfully. Proceed to hospital onboarding."
    )
  );
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  await verifyRecaptcha(req.body?.recaptchaToken, "login");
  const { email, password } = req.body;

  if (!email || typeof email !== "string" || !password || typeof password !== "string") {
    throw new ApiError(400, "Email and password are required");
  }

  const normalizedEmail = email.toLowerCase().trim();

  const user = await db.user.findUnique({ where: { email: normalizedEmail } });

  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (!user.isActive) {
    throw new ApiError(403, "This account has been deactivated.");
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password");
  }

  const { userAgent, ipAddress } = getRequestMeta(req);
  const tokens = await generateAccessAndRefreshToken(user.id, {
    userAgent: userAgent ?? undefined,
    ipAddress: ipAddress ?? undefined,
  });

  const loggedInUser = await db.user.findUnique({
    where: { id: user.id },
    select: SAFE_USER_SELECT,
  });

  const userRole = loggedInUser?.roleId
    ? await db.role.findUnique({ where: { id: loggedInUser.roleId } })
    : null;
  await writeAuditLog(req, {
    action: "login",
    entityType: "User",
    entityId: user.id,
    tenantId: user.tenantId,
    userId: user.id,
    newValue: { isActive: user.isActive },
  });
    
  return res
    .status(200)
    .cookie("accessToken", tokens.accessToken, options)
    .cookie("refreshToken", tokens.refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser ? { ...loggedInUser, isSuperAdmin: Boolean(loggedInUser.isSuperAdmin && isConfiguredSuperAdmin(loggedInUser.email)) } : loggedInUser,
          ...tokens,
          role: userRole
            ? { ...userRole, permissions: getEffectiveRolePermissions(userRole.name, userRole.permissions) }
            : null,
        },
        "User logged in successfully!"
      )
    );
});

export const  refreshAccessToken = asyncHandler(async (req: Request,res: Response) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized access");
  }

  const { decoded } = await verifySessionFromRefreshToken(incomingRefreshToken);

  const user = await db.user.findUnique({
    where: { id: decoded._id },
    select: SAFE_USER_SELECT,
  });
  if (!user) {
    throw new ApiError(400, "User not found");
  }
  if (!user.isActive) {
    throw new ApiError(403, "This account has been deactivated.");
  }

  const accessToken = jwt.sign(
    {
      id: user.id ,
      email: user.email,
      name: user.name,
    },
    process.env.ACCESS_TOKEN_SECRET as string,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY as jwt.SignOptions["expiresIn"],
    }
  )
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .json(
      new ApiResponse(
        200,
        { user: { ...user, isSuperAdmin: Boolean(user.isSuperAdmin && isConfiguredSuperAdmin(user.email)) }, accessToken },
        "Token generated successfully",
      ),
    );
})

export const currentUser = asyncHandler(async (req:Request, res:Response) => {
    const ownerRole = req.user?.roleId
      ? await db.role.findUnique({ where: { id: req.user.roleId } })
      : null;

      const user = {
        ...req.user,
        role: ownerRole?.name,
        permissions: ownerRole
          ? getEffectiveRolePermissions(ownerRole.name, ownerRole.permissions)
          : [],
      };
  return res
    .status(200)
    .json(new ApiResponse(200, 
      user
    , "User fetched Successfully"));
});

export const logout = asyncHandler(async (req:Request, res:Response) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;
  await revokeSessionByRefreshToken(incomingRefreshToken);
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, `${req.user?.name} Logged Out Successfully!`));
});
