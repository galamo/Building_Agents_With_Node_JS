import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

const MCP_URL = process.env.MCP_PRODUCTS_URL || "http://localhost:3110/mcp";

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
    let field;
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
    return new DynamicStructuredTool({
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

export async function connectProductsMcp() {
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL));
  const client = new Client(
    { name: "lab11-products-agent", version: "1.0.0" },
    { capabilities: {} }
  );

  await client.connect(transport);

  const tools = await getMcpToolsAsLangChain(client);

  return {
    client,
    transport,
    tools,
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
