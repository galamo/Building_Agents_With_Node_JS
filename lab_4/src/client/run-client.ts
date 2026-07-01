import * as dotenv from "dotenv";
dotenv.config();

import { callAgentApi } from "./agent-client";

const examples = [
  "What is 25 * 18?",
  "Explain what LangChain tools are",
  "Write a TypeScript function that validates an email address",
  "Who are you?",
];

async function runClient(): Promise<void> {
  console.log("==============================================");
  console.log("  Lab 4 — Agent Client Demo");
  console.log("  Make sure the server is running: npm run dev");
  console.log("==============================================\n");

  for (const message of examples) {
    console.log("─".repeat(54));
    console.log(`Input    : ${message}`);

    try {
      const result = await callAgentApi(message);
      console.log(`Category : ${result.route.category}`);
      console.log(`Reasoning: ${result.route.reasoning}`);
      console.log(`Agent    : ${result.selectedAgent}`);
      console.log(`Answer   :\n${result.answer}`);
    } catch (err) {
      console.error(`Error    : ${err instanceof Error ? err.message : String(err)}`);
    }

    console.log();
  }
}

runClient();
