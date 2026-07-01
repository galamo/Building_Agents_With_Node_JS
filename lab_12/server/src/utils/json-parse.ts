import { AIMessage } from "@langchain/core/messages";

export function parseJsonFromAgentText(text: string): unknown {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new Error("Agent returned invalid JSON.");
  }
}

export function getAgentText(result: {
  messages?: Array<{
    _getType?: () => string;
    constructor?: { name?: string };
    content?: unknown;
    type?: string;
    role?: string;
  }>;
}): string {
  const messages = result?.messages ?? [];

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const role =
      msg._getType?.() ??
      msg.type ??
      msg.role ??
      msg.constructor?.name ??
      "";

    if (
      msg instanceof AIMessage ||
      String(role).toLowerCase().includes("ai") ||
      msg.role === "assistant"
    ) {
      const content = msg.content;
      if (typeof content === "string" && content.trim()) {
        return content.trim();
      }
      if (Array.isArray(content)) {
        const textParts = content
          .filter((part): part is { type: string; text: string } =>
            typeof part === "object" &&
            part !== null &&
            "text" in part &&
            typeof (part as { text?: unknown }).text === "string"
          )
          .map((part) => part.text);
        const joined = textParts.join("\n").trim();
        if (joined) return joined;
      }
    }
  }

  throw new Error("Agent returned no text.");
}
