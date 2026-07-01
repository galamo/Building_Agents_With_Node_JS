/**
 * LangChain RAG search agent: find best-matching images by query (top k = 5).
 */
import { getImageById, searchImagesByText } from "../lib/db.js";
import { searchImageVectors } from "../lib/image-vector-store.js";

const DEFAULT_K = 5;

function normalizeRow(row, score, matchType) {
  return {
    id: row.id,
    url: row.url,
    filename: row.filename,
    originalName: row.original_name,
    description: row.description,
    tags: row.tags || [],
    subjects: row.subjects || [],
    extractedText: row.extracted_text,
    score,
    matchType,
    createdAt: row.created_at,
  };
}

/**
 * Search indexed images using vector RAG (primary) with text-match fallback.
 * @param {string} query
 * @param {number} [k=5]
 */
export async function runImageSearchAgent(query, k = DEFAULT_K) {
  const trimmed = query.trim();
  if (!trimmed) {
    return { query: trimmed, results: [] };
  }

  const vectorHits = await searchImageVectors(trimmed, k);
  const seen = new Set();
  const results = [];

  for (const hit of vectorHits) {
    const imageId = hit.metadata?.imageId;
    if (!imageId || seen.has(imageId)) continue;

    const row = await getImageById(imageId);
    if (!row) continue;

    seen.add(imageId);
    results.push(normalizeRow(row, hit.score, "rag"));
  }

  if (results.length < k) {
    const textHits = await searchImagesByText(trimmed, k);
    for (const row of textHits) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      results.push(normalizeRow(row, row.score ?? 0.5, row.match_type || "text_match"));
      if (results.length >= k) break;
    }
  }

  return {
    query: trimmed,
    results: results.slice(0, k),
  };
}
