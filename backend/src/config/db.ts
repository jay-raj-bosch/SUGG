import { Pool } from "pg";
import { env } from "./env";

export const db = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

db.on("error", (err) => {
  console.error("Unexpected PostgreSQL client error:", err);
});

export async function testConnection(): Promise<void> {
  const client = await db.connect();
  client.release();
  console.log("✅ PostgreSQL connected successfully");
}
