import OpenAI from "openai";
import { ApiError } from "../utils/apiError.js";

const aiClient = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const extractDoctorDetailsFromCV = async (cvText: string) => {
  try {
    const response = await aiClient.chat.completions.create({
      // For strict JSON extraction, use a highly capable model.
      // gpt-4o-mini or gemini-1.5-flash are very cheap and perfect for this.
      model: "cohere/north-mini-code:free", 
      
      // THIS IS CRITICAL: It forces the AI to output valid JSON only.
      response_format: { type: "json_object" }, 
      
      messages: [
        {
          role: "system",
          content: `You are a strict data extraction tool for a hospital management system. 
          Extract the doctor's details from the provided CV text to pre-fill an onboarding form.

          You MUST respond ONLY with a valid JSON object using this exact structure:
          {
            "fullName": "string or null",
            "email": "string or null",
            "phone": "string or null",
            "specialization": "string or null (e.g., Pediatric Cardiology)",
            "licenseNumber": "string or null (Medical license ID)",
            "designation": "string or null (e.g., Head of Surgery, Senior Consultant)",
            "qualifications": "string or null (e.g., MD, FACS, MBBS)",
            "professionalDescription": "string or null (A brief 2-3 sentence clinical biography summarized from their experience)"
          }

          Rules:
          - If a field is not found in the CV, set its value to null.
          - Do not invent info not present in the CV.
          - Do not include any extra text, markdown wrappers, or explanations.`
        },
        {
          role: "user",
          content: `Here is the doctor's CV text:\n\n${cvText}`
        }
      ],
      temperature: 0.1, // Keep it very low (0.1) so the AI acts like a robot, not a creative writer.
    });

    const aiOutput = response.choices[0].message.content;
    
    if (!aiOutput) {
      throw new Error("AI returned empty response");
    }

    // Convert the AI's string output into a real JavaScript object
    const parsedData = JSON.parse(aiOutput);
    return parsedData;

  } catch (error) {
    console.error("CV Extraction failed:", error);
    throw new ApiError(502, "Failed to parse CV data. Please fill the form manually.");
  }
};