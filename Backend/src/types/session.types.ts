import type { Session } from "../generated/prisma/client.js";

export interface RefreshTokenPayload {
  sid: string;
  _id: string;
}

export interface SessionResponse {
  decoded: RefreshTokenPayload;
  session: Session;
}