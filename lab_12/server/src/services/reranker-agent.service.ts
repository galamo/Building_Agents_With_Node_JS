import { HumanMessage } from "@langchain/core/messages";
import { createAgent } from "langchain";
import { z } from "zod";
import { getEnv } from "../config/env.js";
import { createOpenRouterChatModel } from "../lib/openrouter.js";
import type { RerankerInput, RerankerOutput } from "../types/image-rag.types.js";
import { getAgentText, parseJsonFromAgentText } from "../utils/json-parse.js";

const RerankerOutputSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      relevanceScore: z.number().min(0).max(1),
      reason: z.string(),
    })
  ),
});

const SYSTEM_PROMPT = `You are a reranker agent for an image RAG system.

Given a user search query and candidate image indexes, rank the candidates by actual visual/search relevance.

Do not rely only on vector similarity.
Prefer candidates that directly match:
- the user query
- visible objects
- scene
- extracted text
- tags
- semantic meaning

Return only valid JSON with this shape:
{
  "results": [
    { "id": "uuid", "relevanceScore": 0.0, "reason": "short reason" }
  ]
}

Each result must include id, relevanceScore from 0 to 1, and a short reason.
Remove clearly irrelevant candidates.
Sort from most relevant to least relevant.`;

export class RerankerAgentService {
  private agent = createAgent({
    model: createOpenRouterChatModel(getEnv().OPENROUTER_RERANKER_MODEL),
    tools: [],
    systemPrompt: SYSTEM_PROMPT,
  });

  async rerank(input: RerankerInput): Promise<RerankerOutput> {
    if (input.candidates.length === 0) {
      return { results: [] };
    }

    const payload = JSON.stringify(input, null, 2);

    const result = await this.agent.invoke({
      messages: [
        new HumanMessage({
          content: `Search query: "${input.query}"\n\nCandidates:\n${payload}`,
        }),
      ],
    });

    const rawText = getAgentText(result);
    return RerankerOutputSchema.parse(parseJsonFromAgentText(rawText));
  }
}

let rerankerAgentService: RerankerAgentService | null = null;

export function getRerankerAgentService(): RerankerAgentService {
  if (!rerankerAgentService) {
    rerankerAgentService = new RerankerAgentService();
  }
  return rerankerAgentService;
}
