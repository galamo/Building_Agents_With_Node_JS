import { ChatOpenAI } from "@langchain/openai";
import { getEnv } from "../config/env.js";

export function createOpenRouterChatModel(model: string) {
  const env = getEnv();
  return new ChatOpenAI({
    model,
    temperature: 0.1,
    apiKey: env.OPENROUTER_API_KEY,
    configuration: {
      baseURL: env.OPENROUTER_BASE_URL,
    },
  });
}
