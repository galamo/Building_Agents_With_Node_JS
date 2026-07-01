import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

const PEOPLE = [
  { name: "Daniel Cohen", role: "Backend Developer", department: "Engineering", location: "Tel Aviv", tech: "Node.js" },
  { name: "Maya Levi", role: "Frontend Developer", department: "Engineering", location: "Haifa", tech: "React" },
  { name: "Adam Rosen", role: "DevOps Engineer", department: "Infrastructure", location: "Tel Aviv", tech: "Kubernetes" },
  { name: "Noa Mizrahi", role: "Data Scientist", department: "Analytics", location: "Jerusalem", tech: "Python" },
  { name: "Ethan Barak", role: "Security Engineer", department: "Security", location: "Beer Sheva", tech: "Rust" },
  { name: "Tamar Shalev", role: "Product Manager", department: "Product", location: "Tel Aviv", tech: "Notion" },
  { name: "Ariel Ben-David", role: "Full Stack Developer", department: "Engineering", location: "Ramat Gan", tech: "TypeScript" },
  { name: "Lior Katz", role: "QA Engineer", department: "Quality", location: "Tel Aviv", tech: "Cypress" },
  { name: "Yael Amar", role: "UX Designer", department: "Design", location: "Haifa", tech: "Figma" },
  { name: "Itay Goldberg", role: "Engineering Manager", department: "Engineering", location: "Tel Aviv", tech: "Go" },
];

const calculate = tool(
  "calculate",
  "Perform basic math: add, subtract, multiply, or divide two numbers.",
  {
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
    operation: z
      .enum(["add", "subtract", "multiply", "divide"])
      .describe("Math operation to perform"),
  },
  async ({ a, b, operation }) => {
    let result: number;

    switch (operation) {
      case "add":
        result = a + b;
        break;
      case "subtract":
        result = a - b;
        break;
      case "multiply":
        result = a * b;
        break;
      case "divide":
        if (b === 0) {
          return {
            content: [{ type: "text" as const, text: "Error: division by zero." }],
            isError: true,
          };
        }
        result = a / b;
        break;
    }

    return {
      content: [{ type: "text" as const, text: `${a} ${operation} ${b} = ${result}` }],
    };
  }
);

const lookupPerson = tool(
  "lookup_person",
  "Look up a person in the company directory by name (partial match allowed).",
  {
    name: z.string().describe("Full or partial name, e.g. 'Maya' or 'Daniel Cohen'"),
  },
  async ({ name }) => {
    const query = name.trim().toLowerCase();
    const matches = PEOPLE.filter((person) =>
      person.name.toLowerCase().includes(query)
    );

    if (matches.length === 0) {
      return {
        content: [{ type: "text" as const, text: `No person found matching "${name}".` }],
      };
    }

    const lines = matches.map(
      (p) =>
        `${p.name} — ${p.role}, ${p.department}, ${p.location}. Favorite tech: ${p.tech}.`
    );

    return {
      content: [{ type: "text" as const, text: lines.join("\n") }],
    };
  }
);

export const labToolsServer = createSdkMcpServer({
  name: "lab",
  version: "1.0.0",
  tools: [calculate, lookupPerson],
});

export const ALLOWED_LAB_TOOLS = [
  "mcp__lab__calculate",
  "mcp__lab__lookup_person",
] as const;
