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
const options = {
  httpOnly: true,
  secure: true,
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;

 export const registerOwner = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  
  console.log(name,email,password);
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
        isSuperAdmin: true,
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
    
  return res
    .status(200)
    .cookie("accessToken", tokens.accessToken, options)
    .cookie("refreshToken", tokens.refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, ...tokens, role: userRole },
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
        { user, accessToken },
        "Token generated successfully",
      ),
    );
})

export const currentUser = asyncHandler(async (req:Request, res:Response) => {
    const ownerRole = req.user?.roleId
      ? await db.role.findUnique({ where: { id: req.user.roleId } })
      : null;

      const user = {...req.user, role: ownerRole?.name}
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