# Lab 9: Image Text Extraction & Search

Upload images, extract text/tags/descriptions with an OpenRouter vision model, index them in PostgreSQL + pgvector, and search by keywords or subjects.

## Architecture

1. **Upload tab (client)** — user selects an image; client sends `multipart/form-data` to `POST /api/upload`.
2. **Image index agent (server)** — LangChain vision model (OpenRouter) extracts description, tags, subjects, and visible text from the image.
3. **Storage** — image file saved under `server/uploads/`; metadata stored in `images` table; searchable text embedded into `image_vectors` (pgvector).
4. **Search tab (client)** — user enters keywords; `POST /api/search` runs RAG retrieval (top **k = 5**) and returns matching images.

## Setup

1. Start PostgreSQL with pgvector (same stack as lab_8 — skip if `lab_8/docker compose up` is already running):

   ```bash
   cd lab_8
   docker compose up -d
   ```

2. Server env and dependencies:

   ```bash
   cd server
   cp .env.example .env
   # Set OPENROUTER_API_KEY in .env
   npm install --legacy-peer-deps
   npm run init-db
   ```

3. Client (dev):

   ```bash
   cd client
   npm install
   npm run dev
   ```

4. Server:

   ```bash
   cd server
   npm start
   ```

   Default port: **3003**. Client dev server proxies `/api` to the backend.

## API

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/upload` | Upload image (`image` field). Returns indexed metadata. |
| `POST` | `/api/search` | Body `{ "query": "..." }`. Returns top 5 matching images. |
| `GET`  | `/api/images` | List all indexed images. |
| `GET`  | `/uploads/:file` | Serve uploaded image files. |
| `GET`  | `/health` | Health check. |

## Environment

| Variable | Description |
|----------|-------------|
| `OPENROUTER_API_KEY` | **Required** — vision + embeddings via OpenRouter |
| `OPENROUTER_VISION_MODEL` | Optional, default `openai/gpt-4o-mini` |
| `OPENROUTER_EMBEDDING_MODEL` | Optional, default `openai/text-embedding-3-small` |
| `PG_HOST`, `PG_PORT`, `PG_USER`, `PG_PASSWORD`, `PG_DATABASE` | PostgreSQL connection (defaults match lab_8: `localhost:5432`, `admin` / `admin123`, `vectordb`) |
| `PORT` | Server port (default `3003`) |
