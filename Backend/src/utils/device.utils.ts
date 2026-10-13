import { Request } from "express";
import { UAParser } from "ua-parser-js";


export const getRequestMeta = (req:Request) => {
  const parser = new UAParser(req.get("user-agent"));
  const result = parser.getResult();
  const userAgent = [
    [result.browser.name, result.browser.version].filter(Boolean).join(" ") || "Unknown browser",
    result.os.name
      ? `on ${[result.os.name, result.os.version].filter(Boolean).join(" ")}`
      : "on Unknown OS",
    result.device.type || result.device.vendor || result.device.model
      ? `(${[result.device.type, result.device.vendor, result.device.model].filter(Boolean).join(" ")})`
      : undefined,
  ].filter(Boolean).join(" ");

  const forwardedFor = req.headers["x-forwarded-for"];
  const ipAddress =
    (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor)
      ?.split(",")[0]
      ?.trim() ||
    req.socket?.remoteAddress ||
    null;

  return { ipAddress, userAgent };
};