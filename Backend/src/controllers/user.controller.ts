import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { db } from "../prisma/db"; // Ensure this imports your Prisma Next client
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken";
import { getRequestMeta } from "../utils/device.utils";
import { generateAccessAndRefreshToken } from "../utils/token.utils";
import { ApiResponse } from "../utils/apiResponse";

const cookieOptions = {
  httpOnly: true,
  secure: true,
};

export const registerUser = asyncHandler(async (req: Request, res: Response) => {
    const { name, email, password } = req.body;

    // 1. Validate mandatory fields
    if ([name, email, password].some((val) => !val || typeof val !== "string" || !val.trim())) {
        throw new ApiError(400, "Name, email, and password are required");
    }

    if (!email.includes("@")) {
        throw new ApiError(400, "Please enter a valid email address");
    }

    // 2. Prevent duplicate accounts
    const existingUser = await db.orm.public.User
        .where({ email: email.toLowerCase().trim() })
        .first();

    if (existingUser) {
        throw new ApiError(409, "User with this email already exists");
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const newUser = await db.orm.public.User.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        isSuperAdmin: true,  
        isActive: true,
    });

    const { userAgent, ipAddress } = getRequestMeta(req);

    const tokens = await generateAccessAndRefreshToken(newUser.id, {
        userAgent: userAgent ?? undefined,
        ipAddress: ipAddress ?? undefined,
    });

    const safeUser = await db.orm.public.User
        .where({ id: newUser.id })
        .select("id", "name", "email", "tenantId", "roleId", "isSuperAdmin", "isActive", "createdAt", "updatedAt")
        .first();

    return res.status(201).json(
        new ApiResponse(
            201,
            {
                user: safeUser,
                ...tokens,
            },
            "Account created successfully. Proceed to hospital onboarding."
        )
    );
});

export const loginOwner = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new ApiError(400, "Email and password are required");
    }

    const user = await db.orm.public.User.where(email).first()

    if (!user) throw new ApiError(404, "User not found");

    if (!user.isSuperAdmin) {
        throw new ApiError(403, "Access denied. You are not registered as a Hospital Owner.");
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) throw new ApiError(401, "Invalid credentials");

    const { userAgent, ipAddress } = getRequestMeta(req);

    const tokens = generateAccessAndRefreshToken(user.id, {
        userAgent: userAgent ?? undefined,
        ipAddress: ipAddress ?? undefined,
    });
    const loggedInUser = await db.orm.public.User.where({email}).select("email","id","createdAt","updatedAt","isActive","name","tenantId","roleId")

    return res.status(200)
    .cookie("accessToken", (await tokens).accessToken, cookieOptions)
    .cookie("refreshToken", (await tokens).refreshToken, cookieOptions)
    .json(
        new ApiResponse(
            200,
            {user:loggedInUser,...tokens},
            "User LoggedIn Successfully!"
        )
    );
});

export const loginTenantMemebers = asyncHandler(async (req: Request, res: Response) => {
    const {email, password} = req.body

    if(!email.trim() || !password.trim()){
        throw new ApiError(400,"Both fields are required!")
    }

    const existingUser = await db.orm.public.User.where(email).first()

    if(!existingUser){
        throw new ApiError(404,"This user does not exist.")
    }

    const isPasswordValid = await bcrypt.compare(password,existingUser.passwordHash)

    if(!isPasswordValid){
        throw new ApiError(401,"Incorrect password!")
    }

    const { userAgent, ipAddress } = getRequestMeta(req);

    const tokens = generateAccessAndRefreshToken(existingUser.id, {
        userAgent: userAgent ?? undefined,
        ipAddress: ipAddress ?? undefined,
    });
    const loggedInUser = await db.orm.public.User.where({email}).select("email","id","createdAt","updatedAt","isActive","name","tenantId","roleId")


})