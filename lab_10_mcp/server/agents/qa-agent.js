/**
 * Lab 10 QA Agent — quiz master with two modes:
 * - mcp: connects to Quiz MCP server for questions/validation
 * - standalone: generates and evaluates questions without MCP
 */
import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
} from "@langchain/core/prompts";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { connectQuizMcp } from "../lib/mcp-client.js";

const STANDALONE_SYSTEM = `You are a quiz master for a technical course on AI agents and MCP.

Your ONLY job is to ask questions and let the user answer. Rules:
- Ask exactly ONE question at a time about the chosen topic.
- Wait for the user's answer before asking the next question.
- After each answer, give brief feedback (correct/incorrect + short explanation).
- Do NOT answer the quiz questions yourself.
- Do NOT dump multiple questions at once.
- When the user says "start" or begins the session, ask the first question.
- Cover about 3 questions per session, then summarize the score.`;

const MCP_SYSTEM = `You are a quiz master connected to a Quiz MCP server.

Your ONLY job is to run a quiz: ask questions, collect the user's answers, and give brief feedback.

Available MCP tools, use only your avilable tools.

Quiz flow:
- Ask exactly ONE question at a time and wait for the user's answer.
- Always fetch questions with get_question — never invent or rewrite questions yourself.
- After the user answers, call check_answer, give brief feedback, then fetch the next question.
- Do NOT answer quiz questions on behalf of the user.
- When get_question returns done, summarize the session.

Out-of-scope requests:
If the user asks for anything outside the quiz flow above — for example: switching topics, adding questions or topics, general chat, homework help, or any action not covered by the available tools — reply with exactly: "I cant do this"
Do NOT call any tool when giving that reply. Do not attempt workarounds.`;


function createModel() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Set OPENROUTER_API_KEY in server/.env");
  }
  const model = process.env.OPENROUTER_MODEL || "anthropic/claude-opus-4.8-fast";
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

/**
 * Standalone mode — no MCP, LLM generates quiz questions.
 */

/**
 * MCP mode — tool-calling agent connected to Quiz MCP server.
 */
async function runMcpAgent({ topic, messages, userMessage }) {
  const connection = await connectQuizMcp(topic);

  try {
    const llm = createModel();
    const { tools, promptText } = connection;

    const prompt = ChatPromptTemplate.fromMessages([
      SystemMessagePromptTemplate.fromTemplate(
        `${MCP_SYSTEM}\n\nMCP session prompt:\n${promptText}`
      ),
      new MessagesPlaceholder("chat_history"),
      HumanMessagePromptTemplate.fromTemplate("{input}"),
      new MessagesPlaceholder("agent_scratchpad"),
    ]);

    const agent = createToolCallingAgent({ llm, tools, prompt });
    const executor = new AgentExecutor({
      agent,
      tools,
      verbose: Boolean(process.env.VERBOSE),
      maxIterations: 4,
    });

    const chatHistory = toLangChainMessages(messages);
    const result = await executor.invoke({
      input: userMessage,
      chat_history: chatHistory,
    });

    return {
      reply: (result.output ?? "").trim() || "No response from agent.",
      mode: "mcp",
    };
  } finally {
    await connection.close();
  }
}

/**
 * Run the QA agent in the given mode.
 * @param {{ mode: 'mcp'|'standalone', topic: string, messages: Array<{role, content}>, userMessage: string }} params
 */
export async function runQaAgent({ mode, topic, messages, userMessage }) {
  if (!userMessage?.trim()) {
    throw new Error("userMessage is required");
  }
  if (!topic) {
    throw new Error("topic is required");
  }

  if (mode === "mcp") {
    return runMcpAgent({ topic, messages, userMessage });
  }

  throw new Error(`Invalid mode: ${mode}. Use "mcp" or "standalone".`);
}

export async function listTopicsFromMcp() {
  const connection = await connectQuizMcp("mcp");
  try {
    const listTool = connection.tools.find((t) => t.name === "list_topics");
    if (!listTool) return [];
    const raw = await listTool.invoke({});
    return JSON.parse(raw);
  } finally {
    await connection.close();
  }
}
