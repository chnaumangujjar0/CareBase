import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

export const connectDB = async () => {
  try {
  const result = await pool.query("SELECT NOW()");
  console.log("Database connected successfully!");
  console.log(result.rows[0]);
} catch (error) {
  console.log(error);
  console.error("Database connection failed:", error.message);
} finally {
  await pool.end();
}
}