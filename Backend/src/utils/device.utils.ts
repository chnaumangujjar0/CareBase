import { Request } from "express";
import { UAParser } from "ua-parser-js";


export const getRequestMeta = (req:Request) => {
  const parser = new UAParser(req.headers["user-agent"]);
  const result = parser.getResult();
  const userAgent = `${result.browser.name || "Unknown browser"} on ${
    result.os.name || "Unknown OS"
  }`;

  const forwardedFor = req.headers["x-forwarded-for"];
  const ipAddress =
    (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor)
      ?.split(",")[0]
      ?.trim() ||
    req.socket?.remoteAddress ||
    null;

  return { ipAddress, userAgent };
};