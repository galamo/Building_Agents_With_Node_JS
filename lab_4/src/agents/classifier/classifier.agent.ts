import { ChatPromptTemplate } from "@langchain/core/prompts";
import { model } from "../../lib/model";
import { CLASSIFIER_SYSTEM_PROMPT } from "./classifier.prompt";
import { routeDecisionSchema, type RouteDecision } from "./classifier.types";

/**
 * The classifier uses withStructuredOutput() — the modern LangChain way
 * to get a typed, validated object back from the model instead of raw text.
 *
 * Under the hood, LangChain uses the model's function/tool calling capability
 * to guarantee the response matches the Zod schema.
 */
const structuredModel = model.withStructuredOutput(routeDecisionSchema);

const classifierPrompt = ChatPromptTemplate.fromMessages([
  ["system", CLASSIFIER_SYSTEM_PROMPT],
  ["human", "{input}"],
]);

// LCEL chain: format prompt → send to structured model → get typed RouteDecision
const classifierChain = classifierPrompt.pipe(structuredModel);

export async function classifyInput(input: string): Promise<RouteDecision> {
  return classifierChain.invoke({ input });
}
