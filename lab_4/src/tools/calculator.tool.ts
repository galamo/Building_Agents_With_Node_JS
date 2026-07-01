import { tool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * Calculator tool — accepts a math expression string and evaluates it.
 *
 * Safety note: only characters valid in arithmetic expressions are allowed.
 * This prevents code injection via the expression string.
 */
export const calculatorTool = tool(
  async ({ expression }: { expression: string }): Promise<string> => {
    // Allow only digits, operators, parentheses, dots, spaces
    if (!/^[\d\s+\-*/().%^]+$/.test(expression)) {
      return "Error: expression contains invalid characters";
    }

    try {
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${expression})`)();
      return String(result);
    } catch {
      return "Error: could not evaluate the expression";
    }
  },
  {
    name: "calculator",
    description:
      "Evaluates a mathematical expression and returns the numeric result. " +
      "Use for any arithmetic: addition, subtraction, multiplication, division, etc. " +
      "Example: '25 * 18' returns '450'.",
    schema: z.object({
      expression: z
        .string()
        .describe(
          "A valid math expression using digits and operators, e.g. '25 * 18' or '(10 + 5) / 3'"
        ),
    }),
  }
);
