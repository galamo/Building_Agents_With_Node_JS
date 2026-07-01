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
    maxTokens: 400,
    
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
  console.log(`Subject: ${subject}\n`);

  const result = await agent.invoke({
    messages: [{ role: "user", content: userPrompt }],
  });

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
