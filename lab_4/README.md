# Lab 4 — First Real Agent

A multi-agent system built with **LangChain JS**, **OpenRouter**, and **Express**.  
This lab teaches you how to build a real working agent system step by step.

---

## What This Lab Teaches

- How to build a **multi-agent system** where a classifier routes requests to specialist agents
- How **classification** works using LangChain's `withStructuredOutput`
- How **tool calling** works using `model.bindTools()` and an agentic loop
- How to expose an agent system over **HTTP** using Express
- How to consume that API from a **TypeScript client**
- Why modern LangChain patterns replace the old `AgentExecutor` approach

---

## How the Multi-Agent System Works

```
User message
     │
     ▼
┌─────────────────────┐
│  Classifier Agent   │  → returns { category, reasoning }
│  withStructuredOutput│
└─────────┬───────────┘
          │
    ┌─────▼──────────────────────────────────┐
    │           Router (switch)               │
    └──┬──────────┬──────────────┬───────────┘
       │          │              │
   math?      developer?    everything else
       │          │              │
  Math Agent  Dev Agent    General Agent
  (calculator  (no tools)   (date tool)
    tool)
       │          │              │
       └──────────┴──────────────┘
                  │
            Final answer
                  │
             HTTP response
```

Each request goes through two steps:
1. **Classification** — the classifier reads the message and returns a typed `RouteDecision`
2. **Execution** — the right specialist agent handles the request (with tools if needed)

---

## Project Structure

```
lab_4/
├── package.json
├── tsconfig.json
├── .env.example
├── README.md
└── src/
    ├── index.ts                         # Server entry point
    │
    ├── server/
    │   ├── app.ts                       # Express app setup
    │   └── routes/
    │       └── agent.routes.ts          # POST /api/agent
    │
    ├── client/
    │   ├── agent-client.ts              # fetch wrapper for the API
    │   └── run-client.ts                # runnable demo client
    │
    ├── lib/
    │   ├── model.ts                     # shared ChatOpenAI instance
    │   └── create-agent.ts              # createAgent() factory
    │
    ├── tools/
    │   ├── calculator.tool.ts           # evaluates math expressions
    │   └── date.tool.ts                 # returns current date/time
    │
    └── agents/
        ├── index.ts                     # public API of the agents module
        ├── types.ts                     # MultiAgentResult type
        ├── multi-agent.system.ts        # orchestration: classify → route → execute
        │
        ├── classifier/
        │   ├── classifier.agent.ts      # LCEL chain with withStructuredOutput
        │   ├── classifier.prompt.ts     # classification instructions
        │   └── classifier.types.ts      # RouteDecision Zod schema + type
        │
        ├── general/
        │   ├── general.agent.ts
        │   └── general.prompt.ts
        │
        ├── math/
        │   ├── math.agent.ts
        │   └── math.prompt.ts
        │
        └── developer/
            ├── developer.agent.ts
            └── developer.prompt.ts
```

---

## How Classification Works

The Classifier Agent uses `model.withStructuredOutput(zodSchema)` — a modern LangChain feature that forces the model to return a JSON object matching a Zod schema.

```ts
// classifier.types.ts
export const routeDecisionSchema = z.object({
  category: z.enum(["general", "math", "weather", "research", "developer_help"]),
  reasoning: z.string(),
});

// classifier.agent.ts
const structuredModel = model.withStructuredOutput(routeDecisionSchema);
const chain = classifierPrompt.pipe(structuredModel);

const result = await chain.invoke({ input: "What is 25 * 18?" });
// result = { category: "math", reasoning: "The user is asking for arithmetic." }
```

The result is **typed** — TypeScript knows the shape of the output at compile time.

---

## How Routing Works

`multi-agent.system.ts` contains a simple switch statement that reads the classification result and calls the right agent:

```ts
const route = await classifyInput(input);

switch (route.category) {
  case "math":
    answer = await mathAgent.invoke(input);
    break;
  case "developer_help":
    answer = await developerAgent.invoke(input);
    break;
  default:
    answer = await generalAgent.invoke(input);
}
```

Adding a new agent means adding a new `case` and a new agent file.

---

## How Tool Calling Works

The key is `createAgent()` in `src/lib/create-agent.ts`. It implements the **agentic loop**:

```
1. Send [SystemMessage, HumanMessage] to the model
2. Model returns either:
   a. A text response   → we're done, return the text
   b. Tool call(s)      → execute the tool(s), add results as ToolMessage(s), go back to 1
```

In code:

```ts
const boundModel = model.bindTools(tools);   // tell the model which tools exist

while (true) {
  const response = await boundModel.invoke(messages);
  messages.push(response);

  if (!response.tool_calls?.length) {
    return response.content;   // final answer
  }

  for (const toolCall of response.tool_calls) {
    const result = await tool.invoke(toolCall.args);
    messages.push(new ToolMessage({ content: result, tool_call_id: toolCall.id }));
  }
}
```

The Math Agent uses the `calculatorTool`. When asked "What is 25 * 18?", the model:
1. Calls `calculator({ expression: "25 * 18" })`
2. Receives `"450"`
3. Responds with "25 * 18 = 450"

---

## How OpenRouter Is Configured

`src/lib/model.ts` creates a shared `ChatOpenAI` instance pointed at OpenRouter:

```ts
export const model = new ChatOpenAI({
  model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
  temperature: 0.2,
  apiKey: process.env.OPENROUTER_API_KEY,
  configuration: {
    baseURL: "https://openrouter.ai/api/v1",   // redirect to OpenRouter
  },
});
```

OpenRouter is OpenAI-API-compatible, so `ChatOpenAI` works without any changes — only the `baseURL` is different.

You can swap the model by changing `OPENROUTER_MODEL` in `.env`:
```
OPENROUTER_MODEL=anthropic/claude-3-haiku
OPENROUTER_MODEL=meta-llama/llama-3-8b-instruct
```

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Create .env
cp .env.example .env

# 3. Add your OpenRouter API key to .env
#    Get one at https://openrouter.ai/keys
OPENROUTER_API_KEY=sk-or-v1-...
```

---

## How to Run the Express Server

```bash
# Development mode (restarts on file change)
npm run dev

# Production
npm start
```

Server starts at `http://localhost:3000`.

---

## How to Call the HTTP API

**Health check:**
```bash
curl http://localhost:3000/health
```
```json
{ "status": "ok" }
```

**Math question:**
```bash
curl -X POST http://localhost:3000/api/agent \
  -H "Content-Type: application/json" \
  -d '{"message":"What is 25 * 18?"}'
```
```json
{
  "input": "What is 25 * 18?",
  "route": {
    "category": "math",
    "reasoning": "The user is asking for an arithmetic calculation."
  },
  "selectedAgent": "math",
  "answer": "I used the calculator: 25 * 18 = 450."
}
```

**Code question:**
```bash
curl -X POST http://localhost:3000/api/agent \
  -H "Content-Type: application/json" \
  -d '{"message":"Write a TypeScript function that validates an email"}'
```

**Missing message (validation):**
```bash
curl -X POST http://localhost:3000/api/agent \
  -H "Content-Type: application/json" \
  -d '{}'
```
```json
{ "error": "message is required" }
```

---

## How to Run the TypeScript Client

The client sends four example messages to the server and prints the results.  
Make sure the server is already running first.

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run client
```

Output example:
```
──────────────────────────────────────────────────────
Input    : What is 25 * 18?
Category : math
Reasoning: The user is asking for an arithmetic calculation.
Agent    : math
Answer   :
25 * 18 = 450
```

---

## How to Add a New Agent

Follow these four steps:

### 1. Create the agent folder

```
src/agents/weather/
  weather.prompt.ts
  weather.agent.ts
```

### 2. Write the prompt and agent

```ts
// weather.prompt.ts
export const WEATHER_SYSTEM_PROMPT = `
You are a weather assistant. ...
`.trim();

// weather.agent.ts
import { createAgent } from "../../lib/create-agent";
import { model } from "../../lib/model";
import { WEATHER_SYSTEM_PROMPT } from "./weather.prompt";

export const weatherAgent = createAgent({
  model,
  systemPrompt: WEATHER_SYSTEM_PROMPT,
});
```

### 3. Add a case to the router

```ts
// multi-agent.system.ts
import { weatherAgent } from "./weather/weather.agent";

case "weather":
  selectedAgent = "weather";
  answer = await weatherAgent.invoke(input);
  break;
```

### 4. That's it — no framework wiring needed

---

## Why `createAgent` Instead of Old LangChain APIs

| Old API | Problem |
|---|---|
| `AgentExecutor` | Deprecated, hides the loop, hard to customize |
| `createToolCallingAgent` | Deprecated, requires AgentExecutor to run |
| `initializeAgentExecutorWithOptions` | Old ReAct pattern, not type-safe |

The modern approach (used in this lab):

| Modern API | What it does |
|---|---|
| `model.bindTools(tools)` | Explicitly tells the model which tools exist |
| `model.withStructuredOutput(schema)` | Forces typed, validated JSON output |
| Manual agentic loop | Transparent, fully customizable, no black box |
| `ChatPromptTemplate.pipe(model)` | LCEL composable chains |

The manual agentic loop in `createAgent()` does exactly what `AgentExecutor` did internally — but it's visible, readable, and easy to modify. This is the pattern the LangChain team now recommends.

---

## Suggested Exercises

1. **Add a Weather Agent** — Create `src/agents/weather/` and route `weather` category to it.

2. **Add the date tool to the math agent** — Let the math agent also answer "What day is it?" type questions.

3. **Change the model** — Set `OPENROUTER_MODEL=anthropic/claude-3-haiku` and compare response quality.

4. **Increase temperature** — Change `temperature` in `model.ts` to `0.8` and re-ask the same questions. Notice the style difference.

5. **Add a `people` command** — If `message === "agents"`, return a list of available agents from the route handler without calling the LLM.

6. **Log token usage** — After each `invoke()` call, log `response.usage_metadata` to track how many tokens each agent consumes.

7. **Add confidence scoring** — Add a `confidence: number` field (0–1) to `RouteDecision` and log it alongside the category.
