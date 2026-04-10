import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;

export const dbPool = connectionString
  ? new Pool({
      connectionString,
      ssl: connectionString.includes("supabase.com") ? { rejectUnauthorized: false } : undefined,
      keepAlive: true,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      max: 10,
    })
  : null;

if (dbPool) {
  dbPool.on("error", (error) => {
    console.error("[ji-backend] Postgres pool error:", error);
  });
}
