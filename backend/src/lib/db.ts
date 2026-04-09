import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;

export const dbPool = connectionString
  ? new Pool({
      connectionString,
      ssl: connectionString.includes("supabase.com") ? { rejectUnauthorized: false } : undefined,
    })
  : null;
