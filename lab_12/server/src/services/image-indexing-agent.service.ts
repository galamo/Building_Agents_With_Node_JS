import { HumanMessage } from "@langchain/core/messages";
import { createAgent } from "langchain";
import { z } from "zod";
import { getEnv } from "../config/env.js";
import { createOpenRouterChatModel } from "../lib/openrouter.js";
import type { ImageIndex } from "../types/image-rag.types.js";
import { getAgentText, parseJsonFromAgentText } from "../utils/json-parse.js";
import { imageToBase64DataUrl } from "../utils/vision.js";

const ImageIndexSchema = z.object({
  title: z.string(),
  description: z.string(),
  objects: z.array(z.string()),
  scene: z.string(),
  colors: z.array(z.string()),
  extractedText: z.string(),
  categories: z.array(z.string()),
  tags: z.array(z.string()),
  searchableKeywords: z.array(z.string()),
  indexedText: z.string(),
});

const SYSTEM_PROMPT = `You are an image indexing agent for a visual RAG search system.

Analyze the provided image and produce a rich searchable representation.

Focus on:
- visible objects
- people count only if relevant, without identifying real people
- scene and environment
- visual style
- text visible in the image
- logos or symbols if clearly visible
- colors
- possible use cases
- keywords a user might search for later

Return only valid JSON with this exact shape:
{
  "title": "short title",
  "description": "detailed description",
  "objects": ["..."],
  "scene": "scene/context",
  "colors": ["..."],
  "extractedText": "visible text or empty string",
  "categories": ["..."],
  "tags": ["..."],
  "searchableKeywords": ["..."],
  "indexedText": "rich natural language paragraph combining all searchable information"
}

Do not include markdown.
Do not invent details that are not visible.`;

function buildIndexedTextFallback(data: Omit<ImageIndex, "indexedText">): string {
  return [
    data.title,
    data.description,
    `Scene: ${data.scene}`,
    data.objects.length ? `Objects: ${data.objects.join(", ")}` : "",
    data.colors.length ? `Colors: ${data.colors.join(", ")}` : "",
    data.extractedText ? `Visible text: ${data.extractedText}` : "",
    data.categories.length ? `Categories: ${data.categories.join(", ")}` : "",
    data.tags.length ? `Tags: ${data.tags.join(", ")}` : "",
    data.searchableKeywords.length
      ? `Keywords: ${data.searchableKeywords.join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join(". ");
}

export class ImageIndexingAgentService {
  private agent = createAgent({
    model: createOpenRouterChatModel(getEnv().OPENROUTER_VISION_MODEL),
    tools: [],
    systemPrompt: SYSTEM_PROMPT,
  });

  async analyzeImage(imagePath: string): Promise<ImageIndex> {
    const { dataUrl } = imageToBase64DataUrl(imagePath);

    const result = await this.agent.invoke({
      messages: [
        new HumanMessage({
          content: [
            {
              type: "text",
              text: "Analyze this image and return the JSON index.",
            },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        }),
      ],
    });

    const rawText = getAgentText(result);
    const parsed = ImageIndexSchema.parse(parseJsonFromAgentText(rawText));

    return {
      ...parsed,
      indexedText:
        parsed.indexedText.trim() ||
        buildIndexedTextFallback(parsed),
    };
  }
}

let imageIndexingAgentService: ImageIndexingAgentService | null = null;

export function getImageIndexingAgentService(): ImageIndexingAgentService {
  if (!imageIndexingAgentService) {
    imageIndexingAgentService = new ImageIndexingAgentService();
  }
  return imageIndexingAgentService;
}
