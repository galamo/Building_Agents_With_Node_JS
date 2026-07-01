import { createAgent } from "../../lib/create-agent";
import { model } from "../../lib/model";
import { calculatorTool } from "../../tools/calculator.tool";
import { MATH_SYSTEM_PROMPT } from "./math.prompt";

/**
 * Math Agent — handles arithmetic and calculation questions.
 * Uses the calculator tool to ensure accurate results via real computation,
 * not the model's internal estimation.
 */
export const mathAgent = createAgent({
  model,
  systemPrompt: MATH_SYSTEM_PROMPT,
  tools: [calculatorTool],
});
