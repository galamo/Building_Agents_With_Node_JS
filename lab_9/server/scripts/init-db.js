/**
 * Apply schema.sql to PostgreSQL.
 * Run: npm run init-db
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, "..", "..", "schema.sql");

const pool = new pg.Pool({
  host: process.env.PG_HOST || "127.0.0.1",
  port: Number(process.env.PG_PORT || "5432"),
  user: process.env.PG_USER || "admin",
  password: process.env.PG_PASSWORD || "admin123",
  database: process.env.PG_DATABASE || "vectordb",
});

async function main() {
  const sql = fs.readFileSync(schemaPath, "utf-8");
  await pool.query(sql);
  console.log("Schema applied from", schemaPath);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
