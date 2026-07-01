import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createProductsMcpServer } from "./create-products-server.js";

const app = express();
app.use(
  cors({
    origin: "*",
    methods: "GET,POST,DELETE,OPTIONS",
    exposedHeaders: ["mcp-session-id", "last-event-id", "mcp-protocol-version"],
  })
);
app.use(express.json());

const transports = new Map();

app.post("/mcp", async (req, res) => {
  try {
    const sessionId = req.headers["mcp-session-id"];

    if (sessionId && transports.has(sessionId)) {
      await transports.get(sessionId).handleRequest(req, res, req.body);
      return;
    }

    if (sessionId) {
      res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Invalid or unknown session ID" },
        id: req.body?.id ?? null,
      });
      return;
    }

    const server = createProductsMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sid) => {
        transports.set(sid, transport);
      },
    });

    transport.onclose = () => {
      const sid = transport.sessionId;
      if (sid) transports.delete(sid);
    };

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("MCP POST error:", err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: err.message || "Internal server error" },
        id: req.body?.id ?? null,
      });
    }
  }
});

app.get("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  if (!sessionId || !transports.has(sessionId)) {
    res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Missing or invalid session ID" },
      id: null,
    });
    return;
  }
  await transports.get(sessionId).handleRequest(req, res);
});

app.delete("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  if (!sessionId || !transports.has(sessionId)) {
    res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Missing or invalid session ID" },
      id: null,
    });
    return;
  }
  await transports.get(sessionId).handleRequest(req, res);
});

app.get("/health", (_req, res) =>
  res.json({ ok: true, service: "products-mcp", tool: "getProducts" })
);

const PORT = Number(process.env.MCP_PORT) || 3110;
app.listen(PORT, () => {
  console.log(`Lab 11 Products MCP server → http://localhost:${PORT}/mcp`);
  console.log(`  Tool: getProducts (filter by name, type, minPrice, maxPrice)`);
});
