import { getPool } from "../db/pool.js";
import type {
  ImageDocumentRow,
  ImageIndex,
  VectorSearchCandidate,
} from "../types/image-rag.types.js";

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return [];
}

export type InsertImageDocumentInput = {
  id: string;
  originalFilename: string;
  storedFilename: string;
  imageUrl: string;
  mimeType: string;
  sizeBytes: number;
  index: ImageIndex;
  embedding: number[];
  metadata?: Record<string, unknown>;
};

export class PgVectorService {
  async insertImageDocument(input: InsertImageDocumentInput): Promise<ImageDocumentRow> {
    const pool = getPool();
    const metadata = {
      scene: input.index.scene,
      categories: input.index.categories,
      searchableKeywords: input.index.searchableKeywords,
      colors: input.index.colors,
      ...input.metadata,
    };

    const result = await pool.query<ImageDocumentRow>(
      `
      INSERT INTO image_documents (
        id,
        original_filename,
        stored_filename,
        image_url,
        mime_type,
        size_bytes,
        title,
        description,
        tags,
        objects,
        colors,
        extracted_text,
        indexed_text,
        metadata,
        embedding
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9::jsonb, $10::jsonb, $11::jsonb, $12, $13, $14::jsonb, $15::vector
      )
      RETURNING *
      `,
      [
        input.id,
        input.originalFilename,
        input.storedFilename,
        input.imageUrl,
        input.mimeType,
        input.sizeBytes,
        input.index.title,
        input.index.description,
        JSON.stringify(input.index.tags),
        JSON.stringify(input.index.objects),
        JSON.stringify(input.index.colors),
        input.index.extractedText || null,
        input.index.indexedText,
        JSON.stringify(metadata),
        toVectorLiteral(input.embedding),
      ]
    );

    return result.rows[0];
  }

  async searchByEmbedding(
    embedding: number[],
    limit = 20
  ): Promise<VectorSearchCandidate[]> {
    const pool = getPool();
    const vectorLiteral = toVectorLiteral(embedding);

    const result = await pool.query<
      ImageDocumentRow & { similarity: string }
    >(
      `
      SELECT
        id,
        image_url,
        title,
        description,
        tags,
        objects,
        extracted_text,
        indexed_text,
        metadata,
        1 - (embedding <=> $1::vector) AS similarity
      FROM image_documents
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector
      LIMIT $2
      `,
      [vectorLiteral, limit]
    );

    return result.rows.map((row) => ({
      id: row.id,
      imageUrl: row.image_url,
      title: row.title ?? "Untitled",
      description: row.description ?? "",
      tags: parseJsonArray(row.tags),
      objects: parseJsonArray(row.objects),
      extractedText: row.extracted_text ?? undefined,
      indexedText: row.indexed_text,
      similarity: Number(row.similarity),
    }));
  }

  async getById(id: string): Promise<ImageDocumentRow | null> {
    const pool = getPool();
    const result = await pool.query<ImageDocumentRow>(
      "SELECT * FROM image_documents WHERE id = $1",
      [id]
    );
    return result.rows[0] ?? null;
  }
}

let pgVectorService: PgVectorService | null = null;

export function getPgVectorService(): PgVectorService {
  if (!pgVectorService) {
    pgVectorService = new PgVectorService();
  }
  return pgVectorService;
}
