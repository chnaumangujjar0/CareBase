import { ApiError } from "./apiError.js";

type RecaptchaAction = "login" | "signup";
type SiteVerifyResponse = {
  success?: boolean;
  score?: number;
  action?: string;
  "error-codes"?: string[];
};

const MINIMUM_SCORE = 0.5;

export const verifyRecaptcha = async (token: unknown, expectedAction: RecaptchaAction): Promise<void> => {
  if (typeof token !== "string" || token.length < 20 || token.length > 4096) {
    throw new ApiError(400, "Complete the reCAPTCHA check and try again.");
  }

  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  if (!secretKey) {
    console.error("RECAPTCHA_SECRET_KEY is not configured.");
    throw new ApiError(503, "reCAPTCHA verification is temporarily unavailable.");
  }

  const body = new URLSearchParams({ secret: secretKey, response: token });
  let result: SiteVerifyResponse;
  try {
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`Google siteverify returned HTTP ${response.status}`);
    result = await response.json() as SiteVerifyResponse;
  } catch (error) {
    console.error("reCAPTCHA verification request failed.", error);
    throw new ApiError(503, "reCAPTCHA verification is temporarily unavailable. Please try again.");
  }

  if (!result.success || result.action !== expectedAction || typeof result.score !== "number" || result.score < MINIMUM_SCORE) {
    throw new ApiError(400, "reCAPTCHA verification failed. Please try again.");
  }
};
