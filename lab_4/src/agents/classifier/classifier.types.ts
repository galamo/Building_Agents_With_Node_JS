import { z } from "zod";

export const routeDecisionSchema = z.object({
  category: z
    .enum(["general", "math", "weather", "research", "developer_help"])
    .describe("The category that best fits the user request"),
  reasoning: z
    .string()
    .describe("A short explanation of why this category was chosen"),
});

export type RouteDecision = z.infer<typeof routeDecisionSchema>;
