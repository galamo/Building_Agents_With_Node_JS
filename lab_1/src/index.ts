import * as readline from "readline";
import * as dotenv from "dotenv";
import { ChatOpenRouter } from "@langchain/openrouter";
import {
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";

dotenv.config();

// --- System Prompt: fictional people directory ---
const SYSTEM_PROMPT = `
You are a helpful assistant that answers questions about a group of 10 people.
Only use the information below to answer. If the user asks about someone or something
not listed here, say that you do not have enough information.

Here are the people:

1. Daniel Cohen
   - Role: Backend Developer
   - Department: Engineering
   - Location: Tel Aviv
   - Favorite Technology: Node.js
   - Personality: Detail-oriented, loves clean code, quiet but precise

2. Maya Levi
   - Role: Frontend Developer
   - Department: Engineering
   - Location: Haifa
   - Favorite Technology: React
   - Personality: Creative, fast learner, great at UI/UX decisions

3. Adam Rosen
   - Role: DevOps Engineer
   - Department: Infrastructure
   - Location: Tel Aviv
   - Favorite Technology: Kubernetes
   - Personality: Methodical, always thinking about reliability and scale

4. Noa Mizrahi
   - Role: Data Scientist
   - Department: Analytics
   - Location: Jerusalem
   - Favorite Technology: Python
   - Personality: Curious, loves finding patterns, very data-driven

5. Ethan Barak
   - Role: Security Engineer
   - Department: Security
   - Location: Beer Sheva
   - Favorite Technology: Rust
   - Personality: Skeptical by nature, always looking for vulnerabilities

6. Tamar Shalev
   - Role: Product Manager
   - Department: Product
   - Location: Tel Aviv
   - Favorite Technology: Notion
   - Personality: Organized, empathetic, great at connecting teams

7. Ariel Ben-David
   - Role: Full Stack Developer
   - Department: Engineering
   - Location: Ramat Gan
   - Favorite Technology: TypeScript
   - Personality: Versatile, always shipping, enjoys both backend and frontend work

8. Lior Katz
   - Role: QA Engineer
   - Department: Quality
   - Location: Tel Aviv
   - Favorite Technology: Cypress
   - Personality: Patient, thorough, writes tests for everything

9. Yael Amar
   - Role: UX Designer
   - Department: Design
   - Location: Haifa
   - Favorite Technology: Figma
   - Personality: Empathetic, user-focused, strong visual intuition

10. Itay Goldberg
    - Role: Engineering Manager
    - Department: Engineering
    - Location: Tel Aviv
    - Favorite Technology: Go
    - Personality: Leadership-driven, strategic thinker, former backend engineer
`;

// --- Model setup ---
const model = new ChatOpenRouter({
  model: "openai/gpt-4o-mini",   // provider/model-name on OpenRouter
  temperature: 0.2,               // Low temperature = more consistent, factual answers
  maxTokens: 500,                 // Limit response length to keep answers concise
  apiKey: process.env.OPENROUTER_API_KEY,
});

// --- CLI setup ---
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

// --- Main chat loop ---
async function main(): Promise<void> {
  console.log("==============================================");
  console.log("  People Directory Chatbot");
  console.log("  Powered by LangChain + OpenRouter");
  console.log("  Type 'exit' to quit.");
  console.log("==============================================\n");

  const conversationHistory: BaseMessage[] = [];

  while (true) {
    const userInput = await ask("You: ");

    if (userInput.trim().toLowerCase() === "exit") {
      console.log("\nGoodbye!");
      rl.close();
      break;
    }

    if (userInput.trim() === "") {
      console.log("Please enter a question.\n");
      continue;
    }

    try {
      // Build the messages array: system context + full conversation history
      const messages = [
        new SystemMessage(SYSTEM_PROMPT),
        ...conversationHistory,
        new HumanMessage(userInput),
      ];

      // Send messages to the model and get a response
      const response = await model.invoke(messages);

      // Keep history in sync so follow-up questions retain prior context
      conversationHistory.push(new HumanMessage(userInput));
      conversationHistory.push(response);

      // response.content is the text reply from the model
      console.log(`\nBot: ${response.content}\n`);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`\nError: ${error.message}\n`);
      } else {
        console.error("\nAn unexpected error occurred.\n");
      }
    }
  }
}

main();
