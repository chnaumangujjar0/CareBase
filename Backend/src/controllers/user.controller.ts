import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { db } from "../prisma/db"; // Ensure this imports your Prisma Next client
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken";
import { getRequestMeta } from "../utils/device.utils";
import { generateAccessAndRefreshToken } from "../utils/token.utils";

const cookieOptions = {
  httpOnly: true,
  secure: true,
};

export const registerUser = asyncHandler(async (req: Request, res: Response) => {
    const { name, email, passwordHash, tenantId = null, isSuperAdmin = false, roleId = null } = req.body;
    
    if ([name, email, passwordHash].some((field) => !field || typeof field !== 'string' || !field.trim())) {
        throw new ApiError(400, "All Fields are required!");
    }

    if (!email.includes("@")) {
        throw new ApiError(400, "Enter Valid email!");
    }

    const existingUser = await db.orm.public.User
        .where({ email }) 
        .first();
        
    if (existingUser) {
        throw new ApiError(409, "User with this email already exists");
    }
    const hashedPassword = await bcrypt.hash(passwordHash, 10);
    const payload = {
        name,
        email,
        passwordHash: hashedPassword,
        isSuperAdmin,
        tenantId,
        roleId
    };
    
    const user = await db.orm.public.User.create(payload); 

    // Remove the passwordHash before returning the data to the client
    const { passwordHash: _, ...safeUser } = user;

    return res.status(201).json({
        statusCode: 201,
        data: safeUser,
        message: "User registered successfully!"
    });
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

    const { passwordHash: _, ...safeUser } = user;

    return res.status(200).json({
        statusCode: 200,
        data: { user: safeUser, ...tokens },
        message: "Owner login successful"
    });
});

