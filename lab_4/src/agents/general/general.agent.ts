import { createAgent } from "../../lib/create-agent";
import { model } from "../../lib/model";
import { dateTool } from "../../tools/date.tool";
import { GENERAL_SYSTEM_PROMPT } from "./general.prompt";

/**
 * General Agent — handles everyday questions and greetings.
 * Equipped with the date tool so it can answer time-related questions.
 */
export const generalAgent = createAgent({
  model,
  systemPrompt: GENERAL_SYSTEM_PROMPT,
  tools: [dateTool],
});
