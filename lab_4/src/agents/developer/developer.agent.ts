import { createAgent } from "../../lib/create-agent";
import { model } from "../../lib/model";
import { DEVELOPER_SYSTEM_PROMPT } from "./developer.prompt";

/**
 * Developer Agent — handles programming, code writing, and technical questions.
 * No tools needed: the model's training knowledge covers code generation well.
 */
export const developerAgent = createAgent({
  model,
  systemPrompt: DEVELOPER_SYSTEM_PROMPT,
});
