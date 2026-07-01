/**
 * Lab 10 QA Agent CLI — run runQaAgent from the command line.
 */
import "dotenv/config";
import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { runQaAgent, listTopicsFromMcp } from "./agents/qa-agent.js";

function usage() {
  console.log(`Usage: npm run chat -- [options]

Run the quiz agent from the command line (same logic as POST /api/chat).

Options:
  --mode mcp|standalone   Agent mode (required unless --list-topics)
  --topic <id>          Quiz topic, e.g. mcp, langchain, agents (required)
  --message "<text>"    Single user message (omit with --interactive)
  --interactive, -i     Multi-turn chat in the terminal
  --list-topics         List available topics from the Quiz MCP server
  --help, -h            Show this help

Environment (.env):
  OPENROUTER_API_KEY    Required
  OPENROUTER_MODEL      Default: openai/gpt-4o-mini
  MCP_QUIZ_URL          Default: http://localhost:3100/mcp
  VERBOSE               Set to 1 for LangChain agent verbose logging

Examples:
  npm run chat -- --mode standalone --topic mcp --message "start"
  npm run chat -- --mode mcp --topic langchain -i
  npm run chat -- --list-topics
`);
}

function parseArgs(argv) {
  const args = {
    mode: "",
    topic: "",
    message: "",
    interactive: false,
    listTopics: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      return { help: true };
    }
    if (arg === "--list-topics") {
      args.listTopics = true;
      continue;
    }
    if (arg === "--interactive" || arg === "-i") {
      args.interactive = true;
      continue;
    }
    if (arg === "--mode") {
      const value = argv[++i];
      if (!value) throw new Error("--mode requires a value");
      args.mode = value;
      continue;
    }
    if (arg === "--topic") {
      const value = argv[++i];
      if (!value) throw new Error("--topic requires a value");
      args.topic = value;
      continue;
    }
    if (arg === "--message") {
      const value = argv[++i];
      if (!value) throw new Error("--message requires a value");
      args.message = value;
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    args.message = args.message ? `${args.message} ${arg}` : arg;
  }

  return args;
}

function validateArgs(args) {
  if (args.listTopics) return;

  if (!args.mode || !["mcp", "standalone"].includes(args.mode)) {
    throw new Error("--mode is required and must be 'mcp' or 'standalone'");
  }
  if (!args.topic) {
    throw new Error("--topic is required");
  }
  if (!args.interactive && !args.message.trim()) {
    throw new Error("Provide --message for a single turn, or use --interactive");
  }
}

async function runSingleTurn({ mode, topic, message }) {
  const result = await runQaAgent({
    mode,
    topic,
    messages: [],
    userMessage: message,
  });
  console.log(`\n[${result.mode}] ${result.reply}\n`);
}

async function runInteractive({ mode, topic }) {
  const messages = [];
  const rl = readline.createInterface({ input, output });

  console.log(`\nQuiz agent (${mode}, topic: ${topic}). Type "exit" or "quit" to end.\n`);

  try {
    while (true) {
      const userMessage = (await rl.question("You: ")).trim();
      if (!userMessage) continue;
      if (/^(exit|quit)$/i.test(userMessage)) break;

      const result = await runQaAgent({
        mode,
        topic,
        messages,
        userMessage,
      });

      messages.push({ role: "user", content: userMessage });
      messages.push({ role: "assistant", content: result.reply });

      console.log(`\nAgent: ${result.reply}\n`);
    }
  } finally {
    rl.close();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }

  if (args.listTopics) {
    const topics = await listTopicsFromMcp();
    console.log("Available topics:");
    for (const topic of topics) {
      const count = topic.questionCount != null ? ` (${topic.questionCount} questions)` : "";
      console.log(`  - ${topic.id}: ${topic.name ?? topic.label ?? topic.id}${count}`);
    }
    return;
  }

  validateArgs(args);

  if (args.interactive) {
    await runInteractive({ mode: args.mode, topic: args.topic });
  } else {
    await runSingleTurn({
      mode: args.mode,
      topic: args.topic,
      message: args.message,
    });
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
