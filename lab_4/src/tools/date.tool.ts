import { tool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * Date tool — returns the current date, time, and timezone.
 * Takes no arguments. Useful for agents that need to answer
 * time-related questions.
 */
export const dateTool = tool(
  async (): Promise<string> => {
    const now = new Date();
    return JSON.stringify({
      date: now.toISOString().split("T")[0],
      time: now.toTimeString().split(" ")[0],
      dayOfWeek: now.toLocaleDateString("en-US", { weekday: "long" }),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  },
  {
    name: "get_current_date",
    description: "Returns the current date, time, day of week, and timezone.",
    schema: z.object({}),
  }
);
