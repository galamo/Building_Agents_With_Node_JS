import { Router, Request, Response } from "express";
import { runMultiAgentSystem } from "../../agents";

export const agentRouter = Router();

agentRouter.post("/agent", async (req: Request, res: Response) => {
  const { message } = req.body as { message?: unknown };

  if (!message || typeof message !== "string" || message.trim() === "") {
    return res.status(400).json({ error: "message is required" });
  }

  try {
    const result = await runMultiAgentSystem(message.trim());
    return res.json(result);
  } catch (error) {
    console.error("[Agent route error]", error);
    return res.status(500).json({
      error: "Agent failed to process the request",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});
