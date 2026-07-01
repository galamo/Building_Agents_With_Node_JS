import { ChatOpenAI } from "@langchain/openai";

if (!process.env.OPENROUTER_API_KEY) {
  throw new Error("OPENROUTER_API_KEY environment variable is required");
}

/**
 * Shared model instance pointed at OpenRouter.
 * OpenRouter is OpenAI-API-compatible, so ChatOpenAI works by simply
 * overriding the baseURL.
 */
export const model = new ChatOpenAI({
  model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
  temperature: 0.2,
  apiKey: process.env.OPENROUTER_API_KEY,
  configuration: {
    baseURL: "https://openrouter.ai/api/v1",
  },
});
