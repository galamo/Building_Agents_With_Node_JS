import { tool } from "@strands-agents/sdk";
import z from "zod";

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

export const calculateTool = tool({
  name: "calculate",
  description: "Perform basic math: add, subtract, multiply, or divide two numbers.",
  inputSchema: z.object({
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
    operation: z
      .enum(["add", "subtract", "multiply", "divide"])
      .describe("Math operation to perform"),
  }),
  callback: ({ a, b, operation }) => {
    switch (operation) {
      case "add":
        return `${a} + ${b} = ${a + b}`;
      case "subtract":
        return `${a} - ${b} = ${a - b}`;
      case "multiply":
        return `${a} × ${b} = ${a * b}`;
      case "divide":
        if (b === 0) return "Error: division by zero.";
        return `${a} ÷ ${b} = ${a / b}`;
    }
  },
});

export const lookupPersonTool = tool({
  name: "lookup_person",
  description: "Look up a person in the company directory by name (partial match allowed).",
  inputSchema: z.object({
    name: z.string().describe("Full or partial name, e.g. 'Maya' or 'Daniel Cohen'"),
  }),
  callback: ({ name }) => {
    const query = name.trim().toLowerCase();
    const matches = PEOPLE.filter((person) =>
      person.name.toLowerCase().includes(query)
    );

    if (matches.length === 0) {
      return `No person found matching "${name}".`;
    }

    return matches
      .map(
        (p) =>
          `${p.name} — ${p.role}, ${p.department}, ${p.location}. Favorite tech: ${p.tech}.`
      )
      .join("\n");
  },
});
