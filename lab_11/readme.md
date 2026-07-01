# Lab 11 — Full-Stack Products Store + AI Agent via MCP

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (React)   :5111                                        │
│  ┌─────────────────────┐   ┌──────────────────────────────────┐ │
│  │  Products Table     │   │  AI Chat Bot                     │ │
│  │  (filters: name,    │   │  (LangChain agent with MCP tool) │ │
│  │   type, price)      │   │                                  │ │
│  └────────┬────────────┘   └────────────┬─────────────────────┘ │
└───────────┼─────────────────────────────┼───────────────────────┘
            │ GET /api/products           │ POST /api/agent/chat
            ▼                             ▼
┌────────────────────────────────────────────────────────────────┐
│  Express API Server  :3011                                     │
│  • GET  /api/products?name=&type=&minPrice=&maxPrice=          │
│  • GET  /api/products/types                                    │
│  • POST /api/agent/chat  → LangChain agent                     │
│         ↓ connectProductsMcp()                                 │
│         calls getProducts MCP tool                             │
└──────────────────────────────┬─────────────────────────────────┘
                               │ StreamableHTTP
                               ▼
┌────────────────────────────────────────────────────────────────┐
│  Products MCP Server  :3110                                    │
│  Tool: getProducts(name?, type?, minPrice?, maxPrice?)         │
│  — same getProductsHandler() as REST API                       │
│  — full inputSchema + outputSchema with Zod                    │
└────────────────────────────────────────────────────────────────┘
```

## Key concept

The `getProductsHandler` function (defined in `data/products.js`) is the single source of truth for product filtering. It is used by:
- The **REST API** (`GET /api/products`) — consumed directly by the React UI
- The **MCP `getProducts` tool** — called by the LangChain agent via MCP protocol

This shows how the same business logic can be exposed both as a traditional REST endpoint and as an AI-accessible MCP tool.

## Getting started

### 1. MCP Server

```bash
cd mcp-server
npm install
npm start          # → http://localhost:3110/mcp
```

### 2. Express + Agent Server

```bash
cd server
npm install
cp .env.example .env   # add your OPENROUTER_API_KEY
npm start              # → http://localhost:3011
```

### 3. React Client (dev mode)

```bash
cd client
npm install
npm run dev            # → http://localhost:5111
```

### Build client into server

```bash
cd client && npm run build   # copies dist/ → server/public/
# then visit http://localhost:3011
```

## Environment variables (`server/.env`)

| Variable | Default | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | — | Required. OpenRouter API key |
| `OPENROUTER_MODEL` | `openai/gpt-4o-mini` | LLM for the agent |
| `MCP_PRODUCTS_URL` | `http://localhost:3110/mcp` | Products MCP server URL |
| `PORT` | `3011` | Express server port |

## MCP Tool: `getProducts`

```json
{
  "name": "getProducts",
  "description": "Search and filter the product catalog...",
  "inputSchema": {
    "name":     "string? — partial name match (case-insensitive)",
    "type":     "string? — exact category match",
    "minPrice": "number? — minimum price in USD",
    "maxPrice": "number? — maximum price in USD"
  },
  "outputSchema": {
    "products": "Product[]",
    "total":    "number"
  }
}
```

## Sample chat prompts

- "Show me all laptops under $2000"
- "What gaming consoles do you have?"
- "Find headphones between $200 and $400"
- "What's the cheapest product?"
- "Compare the two laptops"
