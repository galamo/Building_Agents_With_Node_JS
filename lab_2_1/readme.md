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

Or set `SYSTEM_PROMPT` in `.env` for all runs.

## Environment

| Variable                 | Description                                                         |
| ------------------------ | ------------------------------------------------------------------- |
| `OPENROUTER_API_KEY`     | Required — from [OpenRouter keys](https://openrouter.ai/keys)       |
| `OPENROUTER_MODEL`       | `openai/gpt-5.5` (default) or `openai/gpt-5.4`                      |
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
