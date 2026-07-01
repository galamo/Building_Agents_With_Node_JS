import "dotenv/config";
import * as readline from "readline";
import { Agent } from "@strands-agents/sdk";
import { calculateTool, lookupPersonTool } from "./tools.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

const agent = new Agent({
  systemPrompt: `You are a helpful assistant with two tools:
- calculate: for math questions
- lookup_person: for questions about company employees

Always use the appropriate tool when the user asks for math or people information.
Answer in plain language after you get tool results.`,
  tools: [calculateTool, lookupPersonTool],
});

async function main(): Promise<void> {
  const hasAwsCreds =
    process.env.AWS_ACCESS_KEY_ID ||
    process.env.AWS_BEARER_TOKEN_BEDROCK ||
    process.env.AWS_PROFILE;

  if (!hasAwsCreds) {
    console.error(
      "Missing AWS credentials. Set AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY or AWS_BEARER_TOKEN_BEDROCK in .env"
    );
    process.exit(1);
  }

  console.log("==================================================");
  console.log("  Lab 3 — Amazon Strands Agents SDK");
  console.log("  Tools: calculate, lookup_person");
  console.log("  Type 'exit' to quit.");
  console.log("==================================================\n");
  console.log('Try: "Multiply 17 by 23"');
  console.log('Try: "Who works in Security?"\n');

  while (true) {
    const userInput = await ask("You: ");

    if (userInput.trim().toLowerCase() === "exit") {
      console.log("\nGoodbye!");
      rl.close();
      break;
    }

    if (userInput.trim() === "") {
      console.log("Please enter a question.\n");
      continue;
    }

    try {
      const result = await agent.invoke(userInput);
      console.log(`\nAgent: ${result.lastMessage}\n`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`\nError: ${message}\n`);
    }
  }
}

main();
