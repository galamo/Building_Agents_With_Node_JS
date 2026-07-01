/**
 * LangChain agent: extract searchable text from an uploaded image via OpenRouter vision.
 */
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { imageToBase64DataUrl } from "../lib/vision.js";

const ExtractionSchema = z.object({
  description: z
    .string()
    .describe("Detailed natural-language description of the image contents"),
  tags: z
    .array(z.string())
    .describe("Short keywords or labels for the image (objects, colors, themes)"),
  subjects: z
    .array(z.string())
    .describe("Main subjects or topics depicted (people, places, products, scenes)"),
  extractedText: z
    .string()
    .describe("Any visible text in the image (signs, labels, captions). Empty string if none."),
});

const SYSTEM_PROMPT = `You are an image indexing agent. Analyze the uploaded image and extract:
- A clear description of what is shown
- Tags (keywords)
- Subjects (main topics/entities)
- Any visible text (OCR)

Be thorough and factual. Use lowercase for tags unless proper nouns. Include synonyms that would help search.`;

function createVisionModel() {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Set OPENROUTER_API_KEY in server/.env");
  }
  return new ChatOpenAI({
    model: process.env.OPENROUTER_VISION_MODEL || "openai/gpt-4o-mini",
    temperature: 0.1,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
    },
  });
}

/**
 * Run the image index agent on a saved image file.
 * @param {string} imagePath - Absolute or relative path to image on disk
 * @returns {Promise<{ description: string, tags: string[], subjects: string[], extractedText: string }>}
 */
export async function runImageIndexAgent(imagePath) {
  const model = createVisionModel().withStructuredOutput(ExtractionSchema, {
    name: "image_extraction",
  });

  const { dataUrl } = imageToBase64DataUrl(imagePath);

  const messages = [
    new SystemMessage({ content: SYSTEM_PROMPT }),
    new HumanMessage({
      content: [
        {
          type: "text",
          text: "Extract description, tags, subjects, and any visible text from this image for search indexing.",
        },
        { type: "image_url", image_url: { url: dataUrl } },
      ],
    }),
  ];

  const result = await model.invoke(messages);
  return {
    description: result.description?.trim() || "",
    tags: (result.tags || []).map((t) => t.trim()).filter(Boolean),
    subjects: (result.subjects || []).map((s) => s.trim()).filter(Boolean),
    extractedText: result.extractedText?.trim() || "",
  };
}

export function buildIndexableContent(extraction) {
  const parts = [
    extraction.description,
    extraction.extractedText,
    `tags: ${extraction.tags.join(", ")}`,
    `subjects: ${extraction.subjects.join(", ")}`,
  ];
  return parts.filter(Boolean).join("\n");
}
