-- Enable pgvector extension and create image RAG tables.
-- EMBEDDING_DIMENSION defaults to 1536 (text-embedding-3-small).
-- Update vector(N) if you change EMBEDDING_DIMENSION in .env.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS image_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_filename TEXT NOT NULL,
  stored_filename TEXT NOT NULL,
  image_url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  title TEXT,
  description TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  objects JSONB DEFAULT '[]'::jsonb,
  colors JSONB DEFAULT '[]'::jsonb,
  extracted_text TEXT,
  indexed_text TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS image_documents_embedding_idx
ON image_documents
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
