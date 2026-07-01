/**
 * pgvector store for image text RAG search.
 */
import { OpenAIEmbeddings } from "@langchain/openai";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";

const TABLE_NAME = "image_vectors";

function requireOpenRouterKey() {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Set OPENROUTER_API_KEY in server/.env");
  }
  return apiKey;
}

export function getEmbeddings() {
  const apiKey = requireOpenRouterKey();
  return new OpenAIEmbeddings(
    {
      model: process.env.OPENROUTER_EMBEDDING_MODEL || "openai/text-embedding-3-small",
      apiKey,
    },
    { basePath: "https://openrouter.ai/api/v1" }
  );
}

function getPostgresOptions() {
  return {
    type: "postgres",
    host: process.env.PG_HOST || "127.0.0.1",
    port: Number(process.env.PG_PORT || "5432"),
    user: process.env.PG_USER || "admin",
    password: process.env.PG_PASSWORD || "admin123",
    database: process.env.PG_DATABASE || "vectordb",
  };
}

export async function getImageVectorStore() {
  return PGVectorStore.initialize(getEmbeddings(), {
    postgresConnectionOptions: getPostgresOptions(),
    tableName: TABLE_NAME,
    columns: {
      idColumnName: "id",
      vectorColumnName: "vector",
      contentColumnName: "content",
      metadataColumnName: "metadata",
    },
  });
}

export async function getImageRetriever(k = 5) {
  const store = await getImageVectorStore();
  return store.asRetriever(k);
}

export async function indexImageDocument({ id, pageContent, metadata }) {
  const store = await getImageVectorStore();
  try {
    await store.addDocuments(
      [{ pageContent, metadata }],
      { ids: [id] }
    );
  } finally {
    await store.end();
  }
}

export async function searchImageVectors(query, k = 5) {
  const store = await getImageVectorStore();
  try {
    const results = await store.similaritySearchWithScore(query, k);
    return results.map(([doc, score]) => ({
      content: doc.pageContent,
      metadata: doc.metadata,
      score,
      matchType: "rag",
    }));
  } finally {
    await store.end();
  }
}
