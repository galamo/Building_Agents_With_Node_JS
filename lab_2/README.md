# Lab 2 — Agent with Custom Tools (Claude Agent SDK)

---

## Learning Goals

By the end of this lab you will be able to:

- Define custom tools with `@anthropic-ai/claude-agent-sdk`
- Register tools as an in-process MCP server with `createSdkMcpServer`
- Run an agent loop with `query()` and let Claude choose when to call tools
- Restrict the agent to only your custom tools (no built-in file/bash tools)

---

## What This Lab Builds

A CLI agent with two **hardcoded tools**:

| Tool | Purpose |
|------|---------|
| `calculate` | Add, subtract, multiply, or divide two numbers |
| `lookup_person` | Search a hardcoded company directory (same 10 people from Lab 1) |

You ask natural-language questions. Claude decides which tool to call, runs it, and answers in plain language.

Example prompts:

- "What is 144 divided by 12?"
- "Who is Maya Levi and what technology does she like?"
- "Multiply 17 by 23, then tell me who the Engineering Manager is."

---

## Prerequisites

- Node.js 18+ (20+ recommended)
- An [Anthropic API key](https://console.anthropic.com/)

---

## Project Structure

```
lab_2/
├── package.json
├── tsconfig.json
├── .env.example
├── README.md
└── src/
    ├── tools.ts    # Tool definitions + MCP server
    └── index.ts    # CLI agent loop
```

---

## Installation

```bash
cd lab_2
npm install
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY
```

---

## How to Run

```bash
npm run dev
```

Type `exit` to quit.

---

## How the Claude Agent SDK Works

### 1. Define a tool with `tool()`

Each tool has four parts: **name**, **description**, **input schema** (Zod), and **handler**.

```typescript
import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

const calculate = tool(
  "calculate",
  "Perform basic math: add, subtract, multiply, or divide two numbers.",
  {
    a: z.number(),
    b: z.number(),
    operation: z.enum(["add", "subtract", "multiply", "divide"]),
  },
  async ({ a, b, operation }) => {
    // ... compute result ...
    return {
      content: [{ type: "text", text: `${a} ${operation} ${b} = ${result}` }],
    };
  }
);
```

Claude reads the name and description to decide **when** to call the tool. The Zod schema tells it **what arguments** to pass.

### 2. Wrap tools in an MCP server

Custom tools run inside your Node process via an in-process MCP server:

```typescript
import { createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";

const labToolsServer = createSdkMcpServer({
  name: "lab",
  version: "1.0.0",
  tools: [calculate, lookupPerson],
});
```

The server name (`lab`) becomes part of each tool's fully qualified name.

### 3. Run the agent with `query()`

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "What is 25 times 4?",
  options: {
    mcpServers: { lab: labToolsServer },
    allowedTools: ["mcp__lab__calculate", "mcp__lab__lookup_person"],
    tools: [],  // remove all built-in Claude Code tools
    permissionMode: "bypassPermissions",
    allowDangerouslySkipPermissions: true,
  },
})) {
  if (message.type === "result" && message.subtype === "success") {
    console.log(message.result);
  }
}
```

Key options:

| Option | What it does |
|--------|--------------|
| `mcpServers` | Registers your in-process MCP server |
| `allowedTools` | Auto-approves tool calls (format: `mcp__{server}__{tool}`) |
| `tools: []` | Removes built-in tools (Read, Bash, etc.) so Claude only sees yours |
| `query()` return value | Async iterator — stream messages as the agent thinks and acts |

### 4. The agent loop

```
User prompt → Claude reasons → picks a tool → tool runs → Claude reads result → final answer
```

This repeats until Claude has enough information to respond.

---

## Tool Naming Convention

If your MCP server is named `lab` and your tool is named `calculate`, the full name is:

```
mcp__lab__calculate
```

Always use this full name in `allowedTools`.

---

## Example Conversation

```
You: What is 144 divided by 12?

[tool call] mcp__lab__calculate

Agent: 144 divided by 12 equals 12.

You: Who is Maya Levi?

[tool call] mcp__lab__lookup_person

Agent: Maya Levi is a Frontend Developer in Engineering, based in Haifa.
Her favorite technology is React.

You: exit
```

---

## Suggested Exercises

1. Add a third tool — e.g. `list_by_department` that returns all people in a department.
2. Add a `convert_units` tool (km ↔ miles, °C ↔ °F).
3. Log every message type from the `query()` iterator to see the full agent trace.
4. Remove `tools: []` and observe what built-in tools Claude tries to use.

---

## Further Reading

- [Claude Agent SDK — Custom Tools](https://code.claude.com/docs/en/agent-sdk/custom-tools)
- [Claude Agent SDK — TypeScript Reference](https://code.claude.com/docs/en/agent-sdk/typescript)
- [Claude Agent SDK — Quickstart](https://code.claude.com/docs/en/agent-sdk/quickstart)
