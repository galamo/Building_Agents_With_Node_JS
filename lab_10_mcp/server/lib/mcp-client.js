/**
 * MCP client helpers: connect to Quiz MCP server and convert tools for LangChain.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

const MCP_URL = process.env.MCP_QUIZ_URL || "http://localhost:3200/mcp";

function mcpInputSchemaToZod(jsonSchema) {
  if (!jsonSchema || typeof jsonSchema !== "object") return z.object({});
  const props = jsonSchema.properties;
  const required = new Set(jsonSchema.required || []);
  if (!props || typeof props !== "object") return z.object({});

  const shape = {};
  for (const [key, prop] of Object.entries(props)) {
    if (!prop || typeof prop !== "object") {
      shape[key] = z.any().optional().nullable();
      continue;
    }
    let field = z.any();
    switch (prop.type) {
      case "string":
        field = z.string();
        break;
      case "number":
      case "integer":
        field = z.number();
        break;
      case "boolean":
        field = z.boolean();
        break;
      default:
        field = z.any();
    }
    if (!required.has(key)) field = field.optional().nullable();
    shape[key] = field;
  }
  return z.object(shape);
}

async function getMcpToolsAsLangChain(mcpClient) {
  const { tools } = await mcpClient.listTools();
  return tools.map((t) => {
    const name = t.name;
    const description = t.description ?? `Call MCP tool: ${name}`;
    const schema = mcpInputSchemaToZod(t.inputSchema);
    return new DynamicStructuredTool({ //langchain 
      name,
      description,
      schema,
      func: async (args) => {
        const result = await mcpClient.callTool({ name, arguments: args });
        const texts = (result.content || [])
          .filter((c) => c.type === "text")
          .map((c) => c.text);
        return texts.join("\n") || JSON.stringify(result);
      },
    });
  });
}

/**
 * Connect to Quiz MCP, optionally fetch start_quiz prompt, return tools + prompt text.
 */
export async function connectQuizMcp(topicId) {
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL));
  const client = new Client(
    { name: "lab10-qa-agent", version: "1.0.0" },
    { capabilities: {} }
  );

  await client.connect(transport);

  let promptText = "";
  try {
    const promptResult = await client.getPrompt({
      name: "start_quiz",
      arguments: { topicId },
    });
    promptText = (promptResult.messages || [])
      .map((m) => {
        const c = m.content;
        if (typeof c === "string") return c;
        if (c?.type === "text") return c.text;
        return "";
      })
      .filter(Boolean)
      .join("\n");
  } catch {
    promptText = `Start a quiz on topic "${topicId}". Use get_question and check_answer tools.`;
  }

  const tools = await getMcpToolsAsLangChain(client);
 
  return {
    client,
    transport,
    tools,
    promptText,
    close: async () => {
      try {
        await transport.close();
      } catch {
        /* ignore */
      }
    },
  };
}

export { MCP_URL };
