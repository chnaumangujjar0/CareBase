import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { db } from "../prisma/db"; 
import bcrypt from "bcrypt"
import { getRequestMeta } from "../utils/device.utils";
import { generateAccessAndRefreshToken } from "../utils/token.utils";
import { ApiResponse } from "../utils/apiResponse";

const options = {
  httpOnly: true,
  secure: true,
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;

 export const registerOwner = asyncHandler(async (req: Request, res: Response) => {
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
 
  const existingUser = await db.orm.public.User.where({
    email: normalizedEmail,
  }).first();
 
  if (existingUser) {
    throw new ApiError(409, "User with this email already exists");
  }
 
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
 
  let newUser;
  try {
    newUser = await db.orm.public.User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      isSuperAdmin: true,
      isActive: true,
    });
  } catch (error: any) {
    if (error?.code === "23505") {
      throw new ApiError(409, "User with this email already exists");
    }
    throw error;
  }
 
  const { userAgent, ipAddress } = getRequestMeta(req);
  const tokens = await generateAccessAndRefreshToken(newUser.id, {
    userAgent: userAgent ?? undefined,
    ipAddress: ipAddress ?? undefined,
  });
 
  const safeUser = await db.orm.public.User.where({ id: newUser.id })
    .select(
      "id",
      "name",
      "email",
      "isSuperAdmin",
      "tenantId",
      "roleId",
      "isActive",
      "createdAt",
      "updatedAt"
    )
    .first();
 
  return res.status(201).json(
    new ApiResponse(
      201,
      { user: safeUser, ...tokens },
      "Account created successfully. Proceed to hospital onboarding."
    )
  );
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || typeof email !== "string" || !password || typeof password !== "string") {
    throw new ApiError(400, "Email and password are required");
  }

  const normalizedEmail = email.toLowerCase().trim();

  const user = await db.orm.public.User.where({ email: normalizedEmail }).first();

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

  const loggedInUser = await db.orm.public.User.where({ id: user.id })
    .select(
      "id",
      "email",
      "name",
      "tenantId",
      "roleId",
      "isActive",
      "createdAt",
      "updatedAt"
    )
    .first();

  return res
    .status(200)
    .cookie("accessToken", tokens.accessToken, options)
    .cookie("refreshToken", tokens.refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, ...tokens },
        "User logged in successfully!"
      )
    );
});

