import { classifyInput } from "./classifier/classifier.agent";
import { generalAgent } from "./general/general.agent";
import { mathAgent } from "./math/math.agent";
import { developerAgent } from "./developer/developer.agent";
import type { MultiAgentResult } from "./types";

/**
 * runMultiAgentSystem — the main orchestration function.
 *
 * Flow:
 *   1. Classifier agent reads the input and returns a category + reasoning.
 *   2. A switch statement routes the input to the correct specialist agent.
 *   3. The specialist agent processes the input (using tools if needed).
 *   4. The result is returned as a structured MultiAgentResult.
 */
export async function runMultiAgentSystem(input: string): Promise<MultiAgentResult> {
  // Step 1: Classify the input
  const route = await classifyInput(input);

  let selectedAgent: string;
  let answer: string;

  // Step 2: Route to the appropriate agent based on classification
  switch (route.category) {
    case "math":
      selectedAgent = "math";
      answer = await mathAgent.invoke(input);
      break;

    case "developer_help":
      selectedAgent = "developer";
      answer = await developerAgent.invoke(input);
      break;

    case "weather":
    case "research":
    case "general":
    default:
      selectedAgent = "general";
      answer = await generalAgent.invoke(input);
      break;
  }

  return {
    input,
    route,
    selectedAgent,
    answer,
  };
}
