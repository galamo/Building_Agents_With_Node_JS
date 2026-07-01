# Kids story agent

Simple LangChain agent that writes short, happy stories for kids (max 5 sentences) using OpenRouter.

## Setup

```bash
cd lab_2_1
npm install
cp .env.example .env
# Edit .env and set OPENROUTER_API_KEY
```

## Run

```bash
npm run agent -- "a friendly dragon"
```

Generate a story illustration and save it under `generated-images/`:

```bash
npm run agent -- --image "a friendly dragon"
```

Optional system prompt override for one run:

```bash
npm run agent -- --system "You are a silly pirate storyteller for toddlers." "treasure hunt"
```

Debug mode — print agent iterations, tool calls, token usage, and reasoning inline:

```bash
npm run agent -- --debug "a friendly dragon"
npm run agent -- --debug --image "a friendly dragon"
```

Or set `SYSTEM_PROMPT` in `.env` for all runs.

## Environment

| Variable                 | Description                                                         |
| ------------------------ | ------------------------------------------------------------------- |
| `OPENROUTER_API_KEY`     | Required — from [OpenRouter keys](https://openrouter.ai/keys)       |
| `OPENROUTER_MODEL`       | `openai/gpt-5.5` (default) or `openai/gpt-5.4` — **gpt-5.4 returns readable reasoning summaries more reliably** |
| `OPENROUTER_IMAGE_MODEL` | `openai/gpt-image-1-mini` (default) — used when `--image` is passed |
| `SYSTEM_PROMPT`          | Optional default system instructions                                |

Story subject is limited to **80 characters**.

Generated images are saved in `generated-images/` inside this lab folder.

# Ex_1

- Add a Tool to save each story in folder - stories_history
- Only If the user request explicitly to save the story.
- (no AI in the tool)

# Ex_2

- Support translation tool - if the user request to translate the story.



## Model reasoning

Reasoning-capable models (e.g. `openai/gpt-5.5`) can return chain-of-thought tokens. The agent requests a readable summary via `modelKwargs.reasoning` (`effort: "high"`, `summary: "detailed"`) and prints it automatically before the story using `printReasoning()` in `agent.js`.

| Option | When to use | Summary |
| ------ | ----------- | ------- |
| **Enable reasoning** | Always, for reasoning-capable models | `modelKwargs: { reasoning: { effort: "high", summary: "detailed" } }` on `ChatOpenRouter`. Without `summary`, gpt-5.x may return only encrypted reasoning. |
| **Print after `invoke()`** | Built in — default behavior | `printReasoning(result)` reads `contentBlocks`, `reasoning_content`, and `reasoning_details` from AI messages and pretty-prints a boxed summary. |
| **Agent trace (`--debug`)** | See iterations, tool calls, and token usage | `printAgentTrace(result)` walks every message in order: user input → assistant turns (reasoning, response, tool_calls) → tool results → summary with cost. |
| **Stream with `streamEvents` v3** | Live output as tokens arrive | Replace `invoke()` with `agent.streamEvents(input, { version: "v3" })`. Use `msg.reasoning` and `msg.text` async iterables. |

If the model returns no reasoning tokens, the box is skipped and only the story is printed. With `openai/gpt-5.5`, OpenRouter may return encrypted reasoning only — the agent shows a short notice in that case. Use `openai/gpt-5.4` for consistent readable summaries.