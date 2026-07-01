import type { SearchImageResponse } from "../types/image-rag.types.js";
import { getEmbeddingService } from "./openrouter-embedding.service.js";
import { getPgVectorService } from "./pgvector.service.js";
import { getRerankerAgentService } from "./reranker-agent.service.js";

const VECTOR_CANDIDATE_LIMIT = 20;

export class ImageSearchService {
  async search(query: string): Promise<SearchImageResponse> {
    const trimmed = query.trim();
    const embedding = await getEmbeddingService().embedText(trimmed);
    const candidates = await getPgVectorService().searchByEmbedding(
      embedding,
      VECTOR_CANDIDATE_LIMIT
    );

    if (candidates.length === 0) {
      return { query: trimmed, results: [] };
    }

    const reranked = await getRerankerAgentService().rerank({
      query: trimmed,
      candidates: candidates.map((candidate) => ({
        id: candidate.id,
        title: candidate.title,
        description: candidate.description,
        tags: candidate.tags,
        objects: candidate.objects,
        extractedText: candidate.extractedText,
        indexedText: candidate.indexedText,
        similarity: candidate.similarity,
      })),
    });

    const candidateById = new Map(candidates.map((c) => [c.id, c]));

    const results = reranked.results
      .map((item) => {
        const candidate = candidateById.get(item.id);
        if (!candidate) return null;

        return {
          id: candidate.id,
          imageUrl: candidate.imageUrl,
          title: candidate.title,
          description: candidate.description,
          tags: candidate.tags,
          objects: candidate.objects,
          similarity: candidate.similarity,
          relevanceScore: item.relevanceScore,
          rerankerReason: item.reason,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return { query: trimmed, results };
  }
}

let imageSearchService: ImageSearchService | null = null;

export function getImageSearchService(): ImageSearchService {
  if (!imageSearchService) {
    imageSearchService = new ImageSearchService();
  }
  return imageSearchService;
}
