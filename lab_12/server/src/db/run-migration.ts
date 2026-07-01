import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getPool, closePool } from "./pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigration() {
  const migrationPath = path.join(
    __dirname,
    "migrations",
    "001_create_image_rag_tables.sql"
  );
  const sql = fs.readFileSync(migrationPath, "utf-8");
  const pool = getPool();

  try {
    await pool.query(sql);
    console.log("Migration applied successfully.");
  } finally {
    await closePool();
  }
}

runMigration().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
