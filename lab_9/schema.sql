CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL UNIQUE,
  original_name VARCHAR(255) NOT NULL,
  url VARCHAR(512) NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  subjects TEXT[] DEFAULT '{}',
  extracted_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_images_tags ON images USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_images_subjects ON images USING GIN (subjects);
CREATE INDEX IF NOT EXISTS idx_images_description ON images USING GIN (to_tsvector('english', coalesce(description, '')));
