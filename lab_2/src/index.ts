import "dotenv/config";
import * as readline from "readline";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { ALLOWED_LAB_TOOLS, labToolsServer } from "./tools.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function runAgent(userPrompt: string): Promise<string> {
  let finalResult = "";

  for await (const message of query({
    prompt: userPrompt,
    options: {
      systemPrompt: `You are a helpful assistant with two tools:
- calculate: for math questions
- lookup_person: for questions about company employees

Always use the appropriate tool when the user asks for math or people information.
Answer in plain language after you get tool results.`,
      mcpServers: { lab: labToolsServer },
      allowedTools: [...ALLOWED_LAB_TOOLS],
      tools: [],
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
    },
  })) {
    if (message.type === "assistant" && message.message?.content) {
      for (const block of message.message.content) {
        if ("text" in block && block.text) {
          process.stdout.write(`\nAgent: ${block.text}\n`);
        } else if ("name" in block) {
          console.log(`\n[tool call] ${block.name}`);
        }
      }
    }

    if (message.type === "result" && message.subtype === "success") {
      finalResult = message.result;
    }
  }

  return finalResult;
}

async function main(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Missing ANTHROPIC_API_KEY. Copy .env.example to .env and add your key.");
    process.exit(1);
  }

  console.log("==================================================");
  console.log("  Lab 2 — Claude Agent SDK + Custom Tools");
  console.log("  Tools: calculate, lookup_person");
  console.log("  Type 'exit' to quit.");
  console.log("==================================================\n");
  console.log('Try: "What is 144 divided by 12?"');
  console.log('Try: "Who is Maya Levi and what tech does she like?"\n');

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
      const result = await runAgent(userInput);
      if (result) {
        console.log(`\nFinal: ${result}\n`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`\nError: ${message}\n`);
    }
  }
}

main();
