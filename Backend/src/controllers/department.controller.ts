import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { db } from "../db";
import { Char36 } from "../types/tenant.types";
import { ApiResponse } from "../utils/apiResponse";

export const addDepartment = asyncHandler(async(req:Request,res:Response) => {
    const {name} = req.body

    if(!name.trim()){
        throw new ApiError(400,"Department name is required!")
    }

    const dep = await db.orm.public.Department.create({name:name.trim(),tenantId:req.user?.tenantId as Char36})

    if(!dep){
        throw new ApiError(400,"Error while creating this department.")
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            dep,
            "Department created successfully!"
        )
    )
})