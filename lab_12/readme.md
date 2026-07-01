# Lab 12 — RAG Image Search

Visual RAG system: upload an image, index it with a LangChain vision agent, store embeddings in PostgreSQL + PGVector, then search by keywords with vector retrieval and an LLM reranker.

## Stack

- **Frontend:** React + TypeScript (Vite)
- **Backend:** Node.js + Express + TypeScript
- **Agents:** LangChain `createAgent` (indexing + reranking)
- **LLM / embeddings:** OpenRouter (OpenAI-compatible API)
- **Vector store:** PostgreSQL + pgvector

## Project layout

```txt
lab_12/
  client/          React UI
  server/          Express API + agents + PGVector
  docker-compose.yml
```

## Prerequisites

- Node.js 20+
- Docker (for PostgreSQL + pgvector)
- OpenRouter API key

## Environment variables

Copy `server/.env.example` to `server/.env` and set your key:

```env
PORT=3001
DATABASE_URL=postgres://postgres:postgres@localhost:5432/image_rag
OPENROUTER_API_KEY=your_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_VISION_MODEL=openai/gpt-4o-mini
OPENROUTER_RERANKER_MODEL=openai/gpt-4o-mini
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSION=1536
UPLOAD_DIR=uploads
MAX_UPLOAD_MB=10
```

If you change the embedding model, update `EMBEDDING_DIMENSION` and the `vector(N)` column in the migration.

## Database setup

Start PostgreSQL with pgvector:

```bash
cd lab_12
docker compose up -d
```

Run the migration:

```bash
cd server
npm install
npm run migrate
```

Or manually:

```bash
psql postgres://postgres:postgres@localhost:5432/image_rag -f src/db/migrations/001_create_image_rag_tables.sql
```

## Run backend

```bash
cd lab_12/server
cp .env.example .env   # if not done yet
npm install
npm run dev
```

Server: `http://localhost:3001`

## Run frontend

```bash
cd lab_12/client
npm install
npm run dev
```

UI: `http://localhost:5173` (proxies `/api` and `/uploads` to the backend)

## API

### Upload

```http
POST /api/images/upload
Content-Type: multipart/form-data
field: image
```

### Search

```http
GET /api/images/search?q=red+car
```

## Example test flow

1. **Start services**

   ```bash
   cd lab_12 && docker compose up -d
   cd server && npm run migrate && npm run dev
   cd ../client && npm run dev
   ```

2. **Upload an image** — open the UI, drag/drop or pick an image (e.g. a photo with a red car), click **Upload & index**.

3. **Verify DB row**

   ```bash
   psql postgres://postgres:postgres@localhost:5432/image_rag -c \
     "SELECT id, title, left(indexed_text, 80) AS indexed_preview FROM image_documents;"
   ```

4. **Search** — in the UI, search for `red car` (or keywords matching your image).

5. **Verify reranked result** — the card should show vector similarity, reranker relevance score, and a short explanation.

## Architecture flow

```mermaid
flowchart LR
  UI[React UI] -->|upload| API[Express API]
  API --> Storage[Local uploads/]
  API --> IndexAgent[Vision indexing agent]
  IndexAgent --> Embed[Embedding service]
  Embed --> PG[(PGVector)]
  UI -->|search q| API
  API --> Embed
  API --> PG
  API --> Rerank[Reranker agent]
  Rerank --> UI
```

## Notes

- Embeddings use OpenRouter’s OpenAI-compatible `/embeddings` endpoint via `OpenAIEmbeddings` and a provider abstraction (`EmbeddingService`).
- The IVFFlat index is created at migration time; if it fails on an empty database, insert one image first, then create the index manually.
- API keys stay on the server only; the React app talks to `/api` through the Vite dev proxy.
