/**
 * migrate.ts — runs migrations.sql then seed.sql against the configured database.
 * Usage: ts-node src/db/migrate.ts
 */
import fs from "fs";
import path from "path";
import { db, testConnection } from "../config/db";

async function run() {
  await testConnection();

  const migrationsPath = path.join(__dirname, "migrations.sql");
  const seedPath = path.join(__dirname, "seed.sql");

  console.log("▶ Running migrations...");
  const migrationSQL = fs.readFileSync(migrationsPath, "utf8");
  await db.query(migrationSQL);
  console.log("✅ Migrations complete");

  console.log("▶ Running seed...");
  const seedSQL = fs.readFileSync(seedPath, "utf8");
  await db.query(seedSQL);
  console.log("✅ Seed complete");

  await db.end();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
