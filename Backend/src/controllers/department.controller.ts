import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { db } from "../db";
import { Char36 } from "../types/tenant.types";
import { ApiResponse } from "../utils/apiResponse";

export const addDepartment = asyncHandler(async(req:Request,res:Response) => {
    const {name, isActive = true} = req.body

    if(!name.trim()){
        throw new ApiError(400,"Department name is required!")
    }

    const dep = await db.orm.public.Department.create({name:name.trim(),tenantId:req.user?.tenantId as Char36,isActive})

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

export const getAllDepartments = asyncHandler(async (req:Request,res:Response) => {
    const {tenantId} = req.params
    const departments = await db.orm.public.Department.where({tenantId:tenantId as Char36})
        console.log(departments);
    return res.status(200).json(
        new ApiResponse(
            200,
            departments,
            "fetched successfully"
        )
    )
})