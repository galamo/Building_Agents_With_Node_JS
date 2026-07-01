# Lab 3 — Agent with Custom Tools (Amazon Strands Agents SDK)

---

## Learning Goals

By the end of this lab you will be able to:

- Build an agent with `@strands-agents/sdk` (Amazon's Strands Agents SDK for TypeScript)
- Define type-safe tools using Zod schemas and the `tool()` helper
- Let the agent automatically choose and invoke tools via `agent.invoke()`
- Compare the Strands approach with the Claude Agent SDK from Lab 2

---

## What This Lab Builds

The same scenario as Lab 2 — a CLI agent with two hardcoded tools:

| Tool | Purpose |
|------|---------|
| `calculate` | Add, subtract, multiply, or divide two numbers |
| `lookup_person` | Search a hardcoded company directory |

The difference is the **SDK and model provider**: Strands uses Amazon Bedrock by default (Claude Sonnet), while Lab 2 uses the Anthropic API directly through the Claude Agent SDK.

---

## Prerequisites

- Node.js 20+
- AWS credentials with access to Amazon Bedrock
- Bedrock model access enabled for Claude (in the AWS console)

---

## Project Structure

```
lab_3/
├── package.json
├── tsconfig.json
├── .env.example
├── README.md
└── src/
    ├── tools.ts    # Tool definitions
    └── index.ts    # CLI agent loop
```

---

## Installation

```bash
cd lab_3
npm install
cp .env.example .env
# Edit .env with your AWS credentials
```

### AWS credentials (pick one)

**Option A — Environment variables**

```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

**Option B — AWS CLI profile**

```bash
aws configure
# Then set AWS_PROFILE in .env if needed
```

**Option C — Bedrock API key**

```
AWS_BEARER_TOKEN_BEDROCK=...
```

---

## How to Run

```bash
npm run dev
```

Type `exit` to quit.

---

## How the Strands Agents SDK Works

### 1. Define a tool with `tool()`

```typescript
import { tool } from "@strands-agents/sdk";
import { z } from "zod";

const calculateTool = tool({
  name: "calculate",
  description: "Perform basic math...",
  inputSchema: z.object({
    a: z.number(),
    b: z.number(),
    operation: z.enum(["add", "subtract", "multiply", "divide"]),
  }),
  callback: ({ a, b, operation }) => {
    // Return a string — the SDK passes it back to the model
    return `${a} + ${b} = ${a + b}`;
  },
});
```

Unlike the Claude Agent SDK, the callback returns a **plain string** (not a `{ content: [...] }` object).

### 2. Create an agent with tools

```typescript
import { Agent } from "@strands-agents/sdk";

const agent = new Agent({
  systemPrompt: "You are a helpful assistant...",
  tools: [calculateTool, lookupPersonTool],
});
```

No MCP server setup — tools are passed directly to the `Agent` constructor.

### 3. Invoke the agent

```typescript
const result = await agent.invoke("What is 25 times 4?");
console.log(result.lastMessage);
```

Strands runs the **agent loop** internally:

```
Input → LLM reasons → tool selection → tool execution → LLM reads result → response
```

---

## Lab 2 vs Lab 3 — Side by Side

| | Lab 2 (Claude Agent SDK) | Lab 3 (Strands SDK) |
|---|---|---|
| Package | `@anthropic-ai/claude-agent-sdk` | `@strands-agents/sdk` |
| Model | Anthropic API (direct) | Amazon Bedrock (default) |
| Tool registration | `createSdkMcpServer` + `mcpServers` | Pass `tools` array to `Agent` |
| Tool handler return | `{ content: [{ type: "text", text: "..." }] }` | Plain string |
| Agent entry point | `query()` async iterator | `agent.invoke()` |
| Tool allowlist | `allowedTools: ["mcp__lab__calculate"]` | Automatic when tools are registered |

Both follow the same mental model: **define tools → give them to an agent → ask in natural language**.

---

## Example Conversation

```
You: Multiply 17 by 23

Agent: 17 multiplied by 23 equals 391.

You: Who works in Security?

Agent: Ethan Barak works in Security. He is a Security Engineer based in
Beer Sheva, and his favorite technology is Rust.

You: exit
```

---

## Suggested Exercises

1. Add a custom Bedrock model with `BedrockModel` (different region or model ID).
2. Use `agent.stream(prompt)` instead of `invoke()` and log each event type.
3. Set `printer: false` on the agent and build your own console output.
4. Add a third tool and compare how Strands vs Claude SDK handle tool selection.

---

## Further Reading

- [Strands Agents — TypeScript Quickstart](https://strandsagents.com/docs/user-guide/quickstart/typescript/)
- [Strands Agents — npm package](https://www.npmjs.com/package/@strands-agents/sdk)
- [Amazon Bedrock AgentCore — Node.js deployment](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-get-started-code-deploy-node.html)
