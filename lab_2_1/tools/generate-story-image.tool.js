import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "..", "generated-images");
const OPENROUTER_IMAGES_URL = "https://openrouter.ai/api/v1/images";

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

async function ensureOutputDir() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

async function requestImage({ apiKey, model, prompt }) {
  const response = await fetch(OPENROUTER_IMAGES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      aspect_ratio: "1:1",
      output_format: "png",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter image API failed (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  const imageData = result?.data?.[0]?.b64_json;

  if (!imageData) {
    throw new Error("OpenRouter image API returned no image data.");
  }

  return imageData;
}

export function createGenerateStoryImageTool({ apiKey, imageModel }) {
  return tool(
    async ({ storyText, imagePrompt }) => {
      const trimmedStory = storyText.trim();
      if (!trimmedStory) {
        return "Error: storyText is required to generate an illustration.";
      }

      const visualPrompt =
        imagePrompt?.trim() ||
        `Children's book illustration, warm and colorful, kid-friendly style: ${trimmedStory}`;

      const imageBase64 = await requestImage({
        apiKey,
        model: imageModel,
        prompt: visualPrompt,
      });

      await ensureOutputDir();

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const storySlug = slugify(trimmedStory) || "story";
      const fileName = `story-${storySlug}-${timestamp}.png`;
      const filePath = path.join(OUTPUT_DIR, fileName);

      await fs.writeFile(filePath, Buffer.from(imageBase64, "base64"));

      const relativePath = path.join("generated-images", fileName);
      return `Image generated and saved to ${relativePath}`;
    },
    {
      name: "generate_story_image",
      description:
        "Generate and save a kid-friendly illustration for a story. " +
        "Call this ONLY when the user explicitly asks for an image, picture, or illustration. " +
        "Pass the full story text and an optional visual prompt.",
      schema: z.object({
        storyText: z
          .string()
          .describe("The complete story text that should be illustrated."),
        imagePrompt: z
          .string()
          .optional()
          .describe(
            "Optional visual description for the image. If omitted, a child-friendly illustration prompt is derived from the story.",
          ),
      }),
    },
  );
}
