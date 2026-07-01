export type UploadedImage = {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  tags: string[];
  objects: string[];
};

export type SearchResult = {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  tags: string[];
  objects: string[];
  similarity: number;
  relevanceScore: number;
  rerankerReason: string;
};

export type UploadResponse = {
  image: UploadedImage;
};

export type SearchResponse = {
  query: string;
  results: SearchResult[];
};
