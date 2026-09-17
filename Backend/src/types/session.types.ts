import { Char } from "@prisma/orm-postgres/target/codec-types";

export interface sessionResponse {
    id: Char<36>;
    userId: Char<36>;
    tokenHash: string;
      ipAddress: string,
      userAgent: string,
      expiresAt: Date, 
      revokedAt: Date,
      createdAt: Date,
}