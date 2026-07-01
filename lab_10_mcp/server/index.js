/**
 * Lab 10 MCP Quiz server — LangChain agent with MCP and standalone modes.
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import { runQaAgent, listTopicsFromMcp } from "./agents/qa-agent.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, "public");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/api/topics", async (_req, res) => {
  try {
    const topics = await listTopicsFromMcp();
    res.json({ topics });
  } catch (err) {
    console.error(err);
    res.status(502).json({
      error: `Could not reach Quiz MCP server: ${err.message}. Start it with: cd mcp-server && npm start`,
    });
  }
});

app.post("/api/chat", async (req, res) => {
  const { mode, topic, messages, userMessage } = req.body || {};

  if (!mode || !["mcp", "standalone"].includes(mode)) {
    return res.status(400).json({ error: "mode must be 'mcp' or 'standalone'" });
  }
  if (!topic || typeof topic !== "string") {
    return res.status(400).json({ error: "topic is required" });
  }
  if (!userMessage || typeof userMessage !== "string") {
    return res.status(400).json({ error: "userMessage is required" });
  }
  if (messages != null && !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages must be an array" });
  }

  try {
    const result = await runQaAgent({
      mode,
      topic,
      messages: messages || [],
      userMessage,
    });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
}

const PORT = process.env.PORT || 3010;
app.listen(PORT, () => {
  console.log(`Lab 10 QA agent server on http://localhost:${PORT}`);
});
