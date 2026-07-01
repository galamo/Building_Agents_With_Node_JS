# Lab 1 — Simple LLM Chatbot with Node.js, TypeScript, LangChain, and OpenRouter

---

## Learning Goals

By the end of this lab you will be able to:

- Connect a Node.js application to an LLM model through OpenRouter using LangChain
- Understand what a system prompt is and how it shapes model behavior
- Send a `SystemMessage` and a `HumanMessage` to a chat model and read the response
- Build a simple interactive CLI chatbot loop

---

## What This Lab Builds

A command-line chatbot that acts as a people directory for a fictional company.  
The model knows about 10 fictional employees. You can ask it questions like:

- "Who is Maya Levi?"
- "Which person likes React?"
- "Who works in the security department?"
- "Give me all people from Tel Aviv."

The model answers **only based on the information in the system prompt**. If you ask about something outside that data, it says it does not have enough information.

---

## Prerequisites

- Node.js v18 or later
- npm v9 or later
- A free [OpenRouter](https://openrouter.ai) account and API key
- Basic knowledge of TypeScript and async/await

---

## Project Structure

```
simple-chatbot/
├── package.json
├── tsconfig.json
├── .env.example
├── README.md
└── src/
    └── index.ts
```

---

## Installation

```bash
# 1. Clone or copy this lab folder, then enter it
cd simple-chatbot

# 2. Install dependencies
npm install
```

---

## Environment Variable Setup

```bash
# Copy the example file
cp .env.example .env
```

Open `.env` and replace the placeholder with your real OpenRouter API key:

```
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxx
```

> You can get a free API key at https://openrouter.ai/keys

---

## How to Run

**Option 1 — run directly with ts-node (recommended for development):**

```bash
npm run dev
```

**Option 2 — compile first, then run:**

```bash
npm run build
npm start
```

---

## Full Code Explanation

### 1. Loading Environment Variables

```typescript
import * as dotenv from "dotenv";
dotenv.config();
```

`dotenv.config()` reads the `.env` file and loads each key-value pair into `process.env`.  
This is how we keep the API key out of the source code.

---

### 2. Creating the Model Instance

```typescript
const model = new ChatOpenAI({
  model: "openai/gpt-4o-mini",
  temperature: 0.2,
  maxTokens: 500,
  apiKey: process.env.OPENROUTER_API_KEY,
  configuration: {
    baseURL: "https://openrouter.ai/api/v1",
  },
});
```

We use `ChatOpenAI` from `@langchain/openai`. Even though the class is called `ChatOpenAI`,
it works with any provider that speaks the OpenAI API format — including OpenRouter.

See the **Model Parameter Explanation** section below for details on every field.

---

### 3. Defining the System Prompt

```typescript
const SYSTEM_PROMPT = `
You are a helpful assistant that answers questions about a group of 10 people.
Only use the information below to answer...
`;
```

The system prompt is sent at the start of every request as a `SystemMessage`.  
It tells the model **who it is** and **what data it can use**.  
The model is instructed to stay within the provided information.

---

### 4. Receiving User Input from the Terminal

```typescript
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}
```

`readline` is a built-in Node.js module that reads text from the terminal.  
We wrap it in a `Promise` so we can use `await` cleanly inside the async loop.

---

### 5. Sending Messages to the Model

```typescript
const messages = [
  new SystemMessage(SYSTEM_PROMPT),
  new HumanMessage(userInput),
];

const response = await model.invoke(messages);
```

LangChain uses a typed message format:

| Class           | Role                                   |
| --------------- | -------------------------------------- |
| `SystemMessage` | Instructions / context for the model   |
| `HumanMessage`  | What the user typed                    |
| `AIMessage`     | The model's reply (returned by invoke) |

`model.invoke(messages)` sends the array to OpenRouter and waits for the reply.

---

### 6. Printing the Model Response

```typescript
console.log(`\nBot: ${response.content}\n`);
```

`response.content` is the text string the model returned.

---

### 7. The Loop

```typescript
while (true) {
  const userInput = await ask("You: ");
  if (userInput.trim().toLowerCase() === "exit") {
    break;
  }
  // ... call model ...
}
```

The loop keeps running until the user types `exit`.  
Each iteration is a completely new request — there is no conversation memory in this lab.

---

## Detailed Model Parameter Explanation

```typescript
const model = new ChatOpenAI({
  model: "openai/gpt-4o-mini",
  temperature: 0.2,
  maxTokens: 500,
  apiKey: process.env.OPENROUTER_API_KEY,
  configuration: {
    baseURL: "https://openrouter.ai/api/v1",
  },
});
```

---

### `model`

| Field   | Value                  |
| ------- | ---------------------- |
| Type    | `string`               |
| Example | `"openai/gpt-4o-mini"` |

**What it does:** Tells OpenRouter which model to route your request to.  
OpenRouter uses the format `provider/model-name`. `openai/gpt-4o-mini` means: use OpenAI's `gpt-4o-mini` model, routed through OpenRouter.

**Why we need it:** Without a model name, OpenRouter does not know which model to call.

**What happens if you change it:**

- `"anthropic/claude-3-haiku"` → uses Anthropic's Claude Haiku instead
- `"meta-llama/llama-3-8b-instruct"` → uses a free open-source model
- Using a wrong name → you will get an API error

**Example values:**

```
"openai/gpt-4o"
"openai/gpt-4o-mini"
"anthropic/claude-3-5-sonnet"
"meta-llama/llama-3-8b-instruct"
```

---

### `temperature`

| Field   | Value          |
| ------- | -------------- |
| Type    | `number`       |
| Range   | `0.0` to `2.0` |
| Example | `0.2`          |

**What it does:** Controls how random or creative the model's output is.

- `0.0` → The model picks the most likely next word every time. Responses are highly deterministic and consistent.
- `1.0` → Balanced creativity. Good for general conversation.
- `2.0` → Very random and unpredictable. Useful for creative writing.

**Why we use `0.2` here:** This chatbot looks up facts from the system prompt. We want accurate, consistent answers — not creative ones. Low temperature keeps the model focused.

**What happens if you change it:**

- Raise to `1.0` → The chatbot may phrase answers differently each time
- Raise to `1.5` → Answers may become less accurate or go off-topic

**Example values:**

```
0.0   → maximum consistency (good for fact retrieval, classification)
0.2   → slightly flexible but reliable (good for Q&A bots)
0.7   → balanced (good for assistants)
1.2   → more creative (good for storytelling)
```

---

### `maxTokens`

| Field   | Value    |
| ------- | -------- |
| Type    | `number` |
| Example | `500`    |

**What it does:** Sets the maximum number of tokens (roughly words/word-pieces) the model can return in a single response.

**Why we need it:** Without this limit the model may return very long responses that cost more and take longer. For a simple Q&A chatbot, 500 tokens is more than enough.

**What happens if you change it:**

- Set to `50` → Very short answers; may get cut off mid-sentence
- Set to `2000` → Longer possible responses; useful for summaries or detailed explanations
- Omit entirely → Uses the model's default maximum (can be thousands of tokens)

---

### `apiKey`

| Field   | Value                            |
| ------- | -------------------------------- |
| Type    | `string`                         |
| Example | `process.env.OPENROUTER_API_KEY` |

**What it does:** Authenticates your request with OpenRouter. Every API call must include a valid key.

**Why we load it from `process.env`:** Never hardcode API keys in source code. Using an environment variable keeps the key out of version control and makes it easy to rotate.

**What happens if it is missing or wrong:** OpenRouter returns a `401 Unauthorized` error.

---

### `configuration.baseURL`

| Field   | Value                            |
| ------- | -------------------------------- |
| Type    | `string`                         |
| Example | `"https://openrouter.ai/api/v1"` |

**What it does:** Overrides the default OpenAI base URL so that `ChatOpenAI` sends requests to OpenRouter instead.

**Why we need it:** By default, `ChatOpenAI` points to `https://api.openai.com/v1`. OpenRouter provides a compatible API at a different URL. Changing `baseURL` is all it takes to redirect every request.

**What happens if you remove it:** All requests go to OpenAI directly. Your OpenRouter key won't work, and you'll get an authentication error.

---

## Example Conversation

```
==============================================
  People Directory Chatbot
  Powered by LangChain + OpenRouter
  Type 'exit' to quit.
==============================================

You: Who is Maya Levi?

Bot: Maya Levi is a Frontend Developer in the Engineering department, based in Haifa.
Her favorite technology is React. She is described as creative, a fast learner,
and great at UI/UX decisions.

You: Which person likes React?

Bot: Maya Levi likes React. She is a Frontend Developer in the Engineering department,
located in Haifa.

You: Who works in the security department?

Bot: Ethan Barak works in the Security department. He is a Security Engineer based in
Beer Sheva, and his favorite technology is Rust.

You: Who is the best pick for a backend task?

Bot: Based on the information provided, Daniel Cohen (Backend Developer, Node.js) or
Itay Goldberg (Engineering Manager, former backend engineer, Go) would be strong
picks for a backend task.

You: Who is Barack Obama?

Bot: I don't have information about Barack Obama in my directory. I can only answer
questions about the 10 people listed in the system.

You: exit

Goodbye!
```

---

## Common Mistakes and Fixes

| Mistake                            | What happens                                    | Fix                                                         |
| ---------------------------------- | ----------------------------------------------- | ----------------------------------------------------------- |
| Missing `.env` file                | `process.env.OPENROUTER_API_KEY` is `undefined` | Copy `.env.example` to `.env` and fill in the key           |
| Wrong API key                      | `401 Unauthorized` error from OpenRouter        | Double-check the key at openrouter.ai/keys                  |
| Wrong model name                   | `404` or model-not-found error                  | Check available models at openrouter.ai/models              |
| Not running `npm install`          | `Cannot find module` errors                     | Run `npm install` in the project folder                     |
| Using `node src/index.ts` directly | `SyntaxError` (Node.js can't run TypeScript)    | Use `npm run dev` (ts-node) or `npm run build && npm start` |

---

## Suggested Exercises

1. **Add more people** — Extend the system prompt with 5 more fictional employees.

2. **Change the temperature** — Try `temperature: 0.0` then `temperature: 1.5`. Ask the same question both times. What changes?

3. **Change the model** — Replace `"openai/gpt-4o-mini"` with `"anthropic/claude-3-haiku"` (or any free model from openrouter.ai/models). Does the response style change?

4. **Ignore empty input** — Currently if you press Enter without typing, the model is called with an empty string. Add a check to skip empty input gracefully. _(Hint: the code already has a blank-string check — find it and make sure it works correctly.)_

5. **JSON-only answers** — Add a line to the system prompt instructing the model to always respond in JSON format, for example: `{ "name": "Maya Levi", "role": "Frontend Developer", "answer": "..." }`.

6. **`people` command** — If the user types `people`, print the list of all 10 people directly from the Node.js code (no LLM call needed), then continue the loop.

7. **Token counting** — After each response, log `response.usage_metadata` to see how many tokens were used for input and output.

# EX_1

- Support History and extended context in the conversation.
