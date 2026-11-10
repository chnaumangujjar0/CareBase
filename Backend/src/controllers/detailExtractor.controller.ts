import type { Request, Response } from "express";
import { PDFParse } from "pdf-parse";
import { extractDoctorDetailsFromCV } from "../services/ai.service.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const uploadAndParseDoctorCV = asyncHandler(async (req: Request, res: Response) => {
  // 1. Ensure Multer successfully attached the file to the request
  if (!req.file) {
    throw new ApiError(400, "Please upload a PDF CV file.");
  }

  if (req.file.mimetype !== "application/pdf") {
    throw new ApiError(400, "Please upload only a PDF file.");
  }
  
  try {
    // 2. Read the raw PDF buffer from memory and extract the text
    const parser = new PDFParse({ data: req.file.buffer });
    const pdfData = await parser.getText();
    await parser.destroy();
    const cvText = pdfData.text;

    // 3. Safety check: Did the PDF actually contain readable text?
    if (!cvText || cvText.trim().length === 0) {
      throw new ApiError(400, "Could not extract text from this PDF. It may be a scanned image.");
    }

    // 4. Send the extracted text to OpenRouter
    const extractedData = await extractDoctorDetailsFromCV(cvText);

    // 5. Return the structured JSON to the frontend form
    return res.status(200).json(
      new ApiResponse(
        200, 
        { formPreFillData: extractedData }, 
        "CV parsed successfully. Please review the extracted details."
      )
    );
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error("PDF Processing Error:", error);
    throw new ApiError(500, "Failed to process the PDF or extract details.");
  }
});