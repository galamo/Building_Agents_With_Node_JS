import "dotenv/config";
import { createAgent } from "langchain";
import { ChatOpenRouter } from "@langchain/openrouter";
import { AIMessage } from "@langchain/core/messages";
import { createGenerateStoryImageTool } from "./tools/generate-story-image.tool.js";

const MAX_SUBJECT_LENGTH = 80;

const DEFAULT_SYSTEM_PROMPT = `You write short, happy stories for young children (ages 4–8).

Rules:
- Write at most 5 sentences total.
- Use simple words and a warm, cheerful tone.
- End on a positive note.
- Do not include a title, labels, or metadata—only the story text.
- You have access to a generate_story_image tool.
- Call generate_story_image ONLY when the user explicitly asks for an image, picture, or illustration.
- If the user did not ask for an image, write the story only and do not call any tools.`;

function usage() {
  console.log(`Usage: npm run agent -- "<subject>"

Write a short happy kids story (max 5 sentences) about the subject.

Options:
  --system "<text>"   Override the system prompt for this run
  --image             Also generate and save a story illustration
  --debug             Print agent iterations, tool calls, and token usage
  --help              Show this help

Environment (.env):
  OPENROUTER_API_KEY        Required
  OPENROUTER_MODEL          Default: openai/gpt-5.5 (also try openai/gpt-5.4)
  OPENROUTER_IMAGE_MODEL    Default: openai/gpt-image-1-mini
  SYSTEM_PROMPT             Optional default system prompt

Subject must be at most ${MAX_SUBJECT_LENGTH} characters.

Example:
  npm run agent -- "a bunny who loves carrots"
  npm run agent -- --image "a bunny who loves carrots"
`);
}

function parseArgs(argv) {
  const args = {
    subject: "",
    systemPrompt: process.env.SYSTEM_PROMPT?.trim() || "",
    generateImage: false,
    debug: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      return { help: true };
    }
    if (arg === "--image") {
      args.generateImage = true;
      continue;
    }
    if (arg === "--debug") {
      args.debug = true;
      continue;
    }
    if (arg === "--system") {
      const value = argv[++i];
      if (!value) {
        throw new Error("--system requires a value");
      }
      args.systemPrompt = value;
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    args.subject = args.subject ? `${args.subject} ${arg}` : arg;
  }

  return args;
}

function validateSubject(subject) {
  const trimmed = subject.trim();
  if (!trimmed) {
    throw new Error("Please provide a story subject (max 80 characters).");
  }
  if (trimmed.length > MAX_SUBJECT_LENGTH) {
    throw new Error(
      `Subject is too long (${trimmed.length} chars). Keep it to ${MAX_SUBJECT_LENGTH} characters or fewer.`,
    );
  }
  return trimmed;
}

function getStoryText(result) {
  const messages = result?.messages ?? [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg instanceof AIMessage || msg?.type === "ai" || msg?.role === "assistant") {
      const content = typeof msg.content === "string" ? msg.content : String(msg.content ?? "");
      if (content.trim()) return content.trim();
    }
  }
  throw new Error("Agent returned no story text.");
}

function getSavedImagePath(result) {
  const messages = result?.messages ?? [];
  for (const msg of messages) {
    const content = typeof msg.content === "string" ? msg.content : String(msg.content ?? "");
    const match = content.match(/saved to (generated-images\/[^\s]+)/i);
    if (match) return match[1];
  }
  return null;
}

function isAiMessage(msg) {
  return msg instanceof AIMessage || msg?.type === "ai" || msg?.role === "assistant";
}

function extractReasoningFromMessage(msg) {
  const parts = [];
  const seen = new Set();

  const add = (text) => {
    const trimmed = text?.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    parts.push(trimmed);
  };

  for (const block of msg.contentBlocks ?? []) {
    if (block.type === "reasoning") add(block.reasoning);
  }

  if (Array.isArray(msg.content)) {
    for (const block of msg.content) {
      if (block?.type === "reasoning") add(block.reasoning ?? block.text);
    }
  }

  add(msg.additional_kwargs?.reasoning_content);

  for (const detail of msg.additional_kwargs?.reasoning_details ?? []) {
    if (detail?.type === "reasoning.text") add(detail.text);
    if (detail?.type === "reasoning.summary") add(detail.summary);
  }

  return parts;
}

function hasEncryptedReasoningOnly(msg) {
  const details = msg.additional_kwargs?.reasoning_details ?? [];
  if (details.length === 0) return false;
  if (extractReasoningFromMessage(msg).length > 0) return false;
  return details.some((detail) => detail?.type === "reasoning.encrypted");
}

function wrapText(text, width) {
  const lines = [];
  for (const paragraph of text.split(/\n+/)) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > width) {
        if (line) lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function printReasoning(result) {
  const blocks = [];
  let encryptedOnly = false;

  for (const msg of result?.messages ?? []) {
    if (!isAiMessage(msg)) continue;
    blocks.push(...extractReasoningFromMessage(msg));
    if (hasEncryptedReasoningOnly(msg)) encryptedOnly = true;
  }

  if (blocks.length === 0 && encryptedOnly) {
    const innerWidth = 58;
    console.log(`\n┌─ Reasoning (encrypted) ${"─".repeat(16)}┐`);
    console.log(`│ ${"The model reasoned internally, but OpenRouter returned".padEnd(innerWidth)} │`);
    console.log(`│ ${"only an encrypted trace (not human-readable).".padEnd(innerWidth)} │`);
    console.log(`│ ${"".padEnd(innerWidth)} │`);
    console.log(`│ ${"Tip: set OPENROUTER_MODEL=openai/gpt-5.4 for reliable".padEnd(innerWidth)} │`);
    console.log(`│ ${"readable reasoning summaries.".padEnd(innerWidth)} │`);
    console.log(`└${"─".repeat(innerWidth + 2)}┘\n`);
    return true;
  }

  if (blocks.length === 0) return false;

  const innerWidth = 58;
  const top = `┌─ Reasoning${blocks.length > 1 ? ` (${blocks.length} steps)` : ""} `;
  const pad = "─".repeat(Math.max(0, innerWidth + 2 - top.length));
  console.log(`\n${top}${pad}┐`);

  blocks.forEach((text, index) => {
    if (blocks.length > 1) {
      console.log(`│ Step ${index + 1}${" ".repeat(innerWidth - 5 - String(index + 1).length)} │`);
      console.log(`├${"─".repeat(innerWidth + 2)}┤`);
    }
    for (const line of wrapText(text, innerWidth)) {
      console.log(`│ ${line.padEnd(innerWidth)} │`);
    }
    if (index < blocks.length - 1) {
      console.log(`├${"─".repeat(innerWidth + 2)}┤`);
    }
  });

  console.log(`└${"─".repeat(innerWidth + 2)}┘\n`);
  return true;
}

function getMessageRole(msg) {
  const type = msg?.type ?? msg?.role;
  if (type === "human" || type === "user") return "user";
  if (isAiMessage(msg)) return "assistant";
  if (type === "tool") return "tool";
  if (type === "system") return "system";
  return type ?? "unknown";
}

function formatMessageContent(msg) {
  if (typeof msg.content === "string") return msg.content.trim();
  if (Array.isArray(msg.content)) {
    return msg.content
      .map((block) => {
        if (typeof block === "string") return block;
        if (block?.type === "text") return block.text;
        return JSON.stringify(block, null, 2);
      })
      .filter(Boolean)
      .join("\n")
      .trim();
  }
  return String(msg.content ?? "").trim();
}

function formatTokenUsage(usage) {
  if (!usage) return null;
  const parts = [
    `tokens: ${usage.total_tokens ?? "?"}`,
    `prompt: ${usage.prompt_tokens ?? "?"}`,
    `completion: ${usage.completion_tokens ?? "?"}`,
  ];
  const reasoning = usage.completion_tokens_details?.reasoning_tokens;
  if (reasoning != null) parts.push(`reasoning: ${reasoning}`);
  if (usage.cost != null) parts.push(`cost: $${Number(usage.cost).toFixed(6)}`);
  return parts.join(" · ");
}

function printBoxSection(title, lines, innerWidth = 58) {
  const divider = `├${"─".repeat(innerWidth + 2)}┤`;
  console.log(divider);
  console.log(`│ ${title.padEnd(innerWidth)} │`);
  console.log(divider);
  for (const line of lines) {
    if (line === "") {
      console.log(`│ ${"".padEnd(innerWidth)} │`);
      continue;
    }
    for (const wrapped of wrapText(line, innerWidth)) {
      console.log(`│ ${wrapped.padEnd(innerWidth)} │`);
    }
  }
}

function printAgentTrace(result) {
  const messages = result?.messages ?? [];
  if (messages.length === 0) return false;

  const innerWidth = 58;
  let iteration = 0;
  let toolCallCount = 0;
  let totalCost = 0;
  const sections = [];

  for (const msg of messages) {
    const role = getMessageRole(msg);
    const lines = [];

    if (role === "user") {
      sections.push({ title: "Input · user", lines: [formatMessageContent(msg) || "(empty)"] });
      continue;
    }

    if (role === "system") {
      sections.push({ title: "System", lines: [formatMessageContent(msg) || "(empty)"] });
      continue;
    }

    if (role === "assistant") {
      iteration += 1;
      const usage = formatTokenUsage(msg.response_metadata?.tokenUsage);
      if (msg.response_metadata?.tokenUsage?.cost != null) {
        totalCost += Number(msg.response_metadata.tokenUsage.cost);
      }

      const reasoning = extractReasoningFromMessage(msg);
      if (reasoning.length > 0) {
        lines.push("reasoning:");
        for (const part of reasoning) lines.push(`  ${part}`);
      }

      const text = formatMessageContent(msg);
      if (text) {
        if (lines.length > 0) lines.push("");
        lines.push("response:");
        lines.push(`  ${text}`);
      }

      if (msg.tool_calls?.length > 0) {
        if (lines.length > 0) lines.push("");
        lines.push("tool_calls:");
        for (const call of msg.tool_calls) {
          toolCallCount += 1;
          const argsJson = JSON.stringify(call.args ?? {}, null, 2);
          lines.push(`  → ${call.name}(${argsJson})`);
        }
      }

      if (!text && !reasoning.length && !msg.tool_calls?.length) {
        lines.push("(empty assistant message)");
      }

      const title = `Iteration ${iteration} · assistant${usage ? ` · ${usage}` : ""}`;
      sections.push({ title, lines });
      continue;
    }

    if (role === "tool") {
      const toolName = msg.name ?? "tool";
      const toolCallId = msg.tool_call_id ? ` · id ${msg.tool_call_id}` : "";
      sections.push({
        title: `Iteration ${iteration} · tool · ${toolName}${toolCallId}`,
        lines: [formatMessageContent(msg) || "(empty tool result)"],
      });
    }
  }

  const header = `┌─ Agent trace · ${iteration} iteration${iteration === 1 ? "" : "s"} · ${toolCallCount} tool call${toolCallCount === 1 ? "" : "s"} `;
  console.log(`\n${header}${"─".repeat(Math.max(0, innerWidth + 2 - header.length))}┐`);

  for (const section of sections) {
    printBoxSection(section.title, section.lines, innerWidth);
  }

  const summaryLines = [
    `messages: ${messages.length}`,
    `iterations: ${iteration}`,
    `tool calls: ${toolCallCount}`,
  ];
  if (totalCost > 0) summaryLines.push(`total cost: $${totalCost.toFixed(6)}`);

  console.log(`├${"─".repeat(innerWidth + 2)}┤`);
  printBoxSection("Summary", summaryLines, innerWidth);
  console.log(`└${"─".repeat(innerWidth + 2)}┘\n`);
  return true;
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.help) {
    usage();
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    console.error("Missing OPENROUTER_API_KEY. Copy .env.example to .env and add your key.");
    process.exit(1);
  }

  const subject = validateSubject(parsed.subject);
  const systemPrompt = (parsed.systemPrompt || DEFAULT_SYSTEM_PROMPT).trim();
  const modelId = process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-5.5";
  const imageModel = process.env.OPENROUTER_IMAGE_MODEL?.trim() || "openai/gpt-image-1-mini";

  const model = new ChatOpenRouter({
    model: modelId,
    apiKey,
    temperature: 0.8,
    maxTokens: 1200,
    modelKwargs: {
      // gpt-5.x often returns only encrypted reasoning unless summary is requested
      reasoning: { effort: "low", summary: "detailed" },
    },
  });

  const generateStoryImageTool = createGenerateStoryImageTool({
    apiKey,
    imageModel,
  });

  const agent = createAgent({
    model,
    tools: [generateStoryImageTool],
    systemPrompt,
  });

  const userPrompt = parsed.generateImage
    ? `Write a short happy story for kids about: ${subject}

After writing the story, generate an illustration image for it and save it.`
    : `Write a short happy story for kids about: ${subject}`;

  console.log(`Model: ${modelId}`);
  if (parsed.generateImage) {
    console.log(`Image model: ${imageModel}`);
  }
  if (parsed.debug) {
    console.log("Debug: on (agent trace enabled)");
  }
  console.log(`Subject: ${subject}\n`);

  const result = await agent.invoke({
    messages: [{ role: "user", content: userPrompt }],
  });

  if (parsed.debug) {
    printAgentTrace(result);
  } else {
    printReasoning(result);
  }

  console.log(getStoryText(result));

  if (parsed.generateImage) {
    const imagePath = getSavedImagePath(result);
    if (imagePath) {
      console.log(`\nImage saved: ${imagePath}`);
    }
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
