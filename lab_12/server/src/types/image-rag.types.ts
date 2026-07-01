export type ImageIndex = {
  title: string;
  description: string;
  objects: string[];
  scene: string;
  colors: string[];
  extractedText: string;
  categories: string[];
  tags: string[];
  searchableKeywords: string[];
  indexedText: string;
};

export type ImageDocumentRow = {
  id: string;
  original_filename: string;
  stored_filename: string;
  image_url: string;
  mime_type: string;
  size_bytes: number;
  title: string | null;
  description: string | null;
  tags: string[];
  objects: string[];
  colors: string[];
  extracted_text: string | null;
  indexed_text: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type VectorSearchCandidate = {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  tags: string[];
  objects: string[];
  extractedText?: string;
  indexedText: string;
  similarity: number;
};

export type RerankerInput = {
  query: string;
  candidates: Array<{
    id: string;
    title: string;
    description: string;
    tags: string[];
    objects: string[];
    extractedText?: string;
    indexedText: string;
    similarity: number;
  }>;
};

export type RerankerOutput = {
  results: Array<{
    id: string;
    relevanceScore: number;
    reason: string;
  }>;
};

export type UploadImageResponse = {
  image: {
    id: string;
    imageUrl: string;
    title: string;
    description: string;
    tags: string[];
    objects: string[];
  };
};

export type SearchImageResponse = {
  query: string;
  results: Array<{
    id: string;
    imageUrl: string;
    title: string;
    description: string;
    tags: string[];
    objects: string[];
    similarity: number;
    relevanceScore: number;
    rerankerReason: string;
  }>;
};
