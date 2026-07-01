import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import { getProductsHandler, PRODUCT_TYPES } from "./data/products.js";
import { runProductsAgent } from "./agents/products-agent.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, "public");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/api/products", (req, res) => {
  const { name, type, minPrice, maxPrice } = req.query;
  const result = getProductsHandler({
    name: name || undefined,
    type: type || undefined,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
  });
  res.json(result);
});

app.get("/api/products/types", (_req, res) => {
  res.json({ types: PRODUCT_TYPES });
});

app.post("/api/agent/chat", async (req, res) => {
  const { messages, userMessage } = req.body || {};

  if (!userMessage || typeof userMessage !== "string") {
    return res.status(400).json({ error: "userMessage is required" });
  }
  if (messages != null && !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages must be an array" });
  }

  try {
    const result = await runProductsAgent({ messages: messages || [], userMessage });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
}

const PORT = Number(process.env.PORT) || 3011;
app.listen(PORT, () => {
  console.log(`Lab 11 Products server → http://localhost:${PORT}`);
  console.log(`  REST API  : GET  /api/products`);
  console.log(`  Agent API : POST /api/agent/chat`);
  console.log(`  MCP server: http://localhost:${process.env.MCP_PORT || 3110}/mcp`);
});
