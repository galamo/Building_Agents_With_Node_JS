/**
 * PostgreSQL client for image metadata.
 */
import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.PG_HOST || "127.0.0.1",
  port: Number(process.env.PG_PORT || "5432"),
  user: process.env.PG_USER || "admin",
  password: process.env.PG_PASSWORD || "admin123",
  database: process.env.PG_DATABASE || "vectordb",
  max: 10,
});

export async function insertImage({
  id,
  filename,
  originalName,
  url,
  description,
  tags,
  subjects,
  extractedText,
}) {
  const result = await pool.query(
    `INSERT INTO images (id, filename, original_name, url, description, tags, subjects, extracted_text)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [id, filename, originalName, url, description, tags, subjects, extractedText]
  );
  return result.rows[0];
}

export async function getImageById(id) {
  const result = await pool.query("SELECT * FROM images WHERE id = $1", [id]);
  return result.rows[0] || null;
}

export async function listImages(limit = 100) {
  const result = await pool.query(
    "SELECT * FROM images ORDER BY created_at DESC LIMIT $1",
    [limit]
  );
  return result.rows;
}

export async function searchImagesByText(query, limit = 5) {
  const pattern = `%${query}%`;
  const result = await pool.query(
    `SELECT *, 1.0 AS score, 'text_match' AS match_type
     FROM images
     WHERE description ILIKE $1
        OR extracted_text ILIKE $1
        OR EXISTS (SELECT 1 FROM unnest(tags) t WHERE t ILIKE $1)
        OR EXISTS (SELECT 1 FROM unnest(subjects) s WHERE s ILIKE $1)
     ORDER BY created_at DESC
     LIMIT $2`,
    [pattern, limit]
  );
  return result.rows;
}
