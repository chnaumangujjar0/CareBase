import { db } from "../prisma/db.js";

export let dbRuntime: any;

export async function connectDB() {
  try {
    dbRuntime = await db.connect({ url: process.env.DATABASE_URL! });
    console.log("✅ PostgreSQL Connected via Prisma Next");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
}


export { db };