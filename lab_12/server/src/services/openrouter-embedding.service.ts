import { OpenAIEmbeddings } from "@langchain/openai";
import { getEnv } from "../config/env.js";
import type { EmbeddingService } from "./embedding.service.js";

/**
 * OpenRouter exposes an OpenAI-compatible /embeddings endpoint.
 * We route OpenAIEmbeddings through OPENROUTER_BASE_URL so the provider
 * can be swapped without touching search/indexing code.
 */
export class OpenRouterEmbeddingService implements EmbeddingService {
  private embeddings: OpenAIEmbeddings;

  constructor() {
    const env = getEnv();
    this.embeddings = new OpenAIEmbeddings({
      model: env.EMBEDDING_MODEL,
      apiKey: env.OPENROUTER_API_KEY,
      configuration: {
        baseURL: env.OPENROUTER_BASE_URL,
      },
    });
  }

  async embedText(text: string): Promise<number[]> {
    const vector = await this.embeddings.embedQuery(text);
    const expected = getEnv().EMBEDDING_DIMENSION;
    if (vector.length !== expected) {
      throw new Error(
        `Embedding dimension mismatch: expected ${expected}, got ${vector.length}. ` +
          "Update EMBEDDING_DIMENSION and the migration vector(N) column."
      );
    }
    return vector;
  }
}

let embeddingService: EmbeddingService | null = null;

export function getEmbeddingService(): EmbeddingService {
  if (!embeddingService) {
    embeddingService = new OpenRouterEmbeddingService();
  }
  return embeddingService;
}
