import express, { Application } from "express";
import { agentRouter } from "./routes/agent.routes";

export function createApp(): Application {
  const app = express();

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api", agentRouter);

  return app;
}
