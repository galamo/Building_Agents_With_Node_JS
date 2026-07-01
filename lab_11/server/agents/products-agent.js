import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
} from "@langchain/core/prompts";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { connectProductsMcp } from "../lib/mcp-client.js";

const SYSTEM_PROMPT = `You are a helpful product assistant for an online store.
You have access to the getProducts tool which lets you search and filter the product catalog.

Guidelines:
- Use getProducts to fetch products when the user asks about items, prices, or categories.
- You can filter by name (partial match), type/category, minPrice, and maxPrice.
- When listing products, include the name, type, price, and a brief note from the description.
- Format prices as USD with 2 decimal places (e.g. $999.99).
- If no products match the filters, say so and suggest broadening the search.
- Be conversational and helpful — you're a knowledgeable store assistant.
- Available product types: Laptop, Smartphone, Tablet, Headphones, Television, Gaming Console, Earbuds, Camera, E-Reader, Smartwatch.`;

function createModel() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Set OPENROUTER_API_KEY in server/.env");
  }
  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
  return new ChatOpenAI({
    model,
    temperature: 0.3,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
    },
  });
}

function toLangChainMessages(messages) {
  return (messages || []).map((m) => {
    if (m.role === "assistant") return new AIMessage(m.content);
    if (m.role === "system") return new SystemMessage(m.content);
    return new HumanMessage(m.content);
  });
}

export async function runProductsAgent({ messages, userMessage }) {
  if (!userMessage?.trim()) throw new Error("userMessage is required");

  const connection = await connectProductsMcp();

  try {
    const llm = createModel();
    const { tools } = connection;

    const prompt = ChatPromptTemplate.fromMessages([
      SystemMessagePromptTemplate.fromTemplate(SYSTEM_PROMPT),
      new MessagesPlaceholder("chat_history"),
      HumanMessagePromptTemplate.fromTemplate("{input}"),
      new MessagesPlaceholder("agent_scratchpad"),
    ]);

    const agent = createToolCallingAgent({ llm, tools, prompt });
    const executor = new AgentExecutor({
      agent,
      tools,
      verbose: Boolean(process.env.VERBOSE),
      maxIterations: 6,
      returnIntermediateSteps: true,
    });

    const chatHistory = toLangChainMessages(messages);
    const result = await executor.invoke({
      input: userMessage,
      chat_history: chatHistory,
    });

    const reply = (result.output ?? "").trim() || "No response from agent.";

    const productSteps = (result.intermediateSteps || []).filter(
      (step) => step.action.tool === "getProducts"
    );
    const lastStep = productSteps[productSteps.length - 1];
    if (lastStep) {
      try {
        const parsed = JSON.parse(lastStep.observation);
        if (Array.isArray(parsed.products)) {
          return { reply, products: parsed.products, total: parsed.total };
        }
      } catch {
        // observation wasn't JSON — fall through to text-only reply
      }
    }

    return { reply };
  } finally {
    await connection.close();
  }
}
