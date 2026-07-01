import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import type { StructuredToolInterface } from "@langchain/core/tools";

interface CreateAgentOptions {
  model: ChatOpenAI;
  systemPrompt: string;
  tools?: StructuredToolInterface[];
}

export interface Agent {
  invoke(input: string): Promise<string>;
}

const MAX_ITERATIONS = 10;

/**
 * createAgent — the core modern LangChain agent factory.
 *
 * Instead of using deprecated APIs like AgentExecutor or createToolCallingAgent,
 * this function composes an agent directly using:
 *   - model.bindTools()       → attaches tools so the model can call them
 *   - model.invoke(messages)  → sends the full conversation and gets a response
 *   - ToolMessage             → feeds tool results back into the conversation
 *
 * The agentic loop runs until the model produces a response with no tool calls,
 * meaning it has a final answer ready.
 */
export function createAgent({ model, systemPrompt, tools = [] }: CreateAgentOptions): Agent {
  // Bind tools to the model so it knows what tools are available
  const boundModel = tools.length > 0 ? model.bindTools(tools) : model;

  // Build a name → tool lookup map for fast access during the loop
  const toolMap = new Map<string, StructuredToolInterface>(
    tools.map((t) => [t.name, t])
  );

  return {
    async invoke(input: string): Promise<string> {
      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(input),
      ];

      let iterations = 0;

      // Agentic loop: keeps running until the model has a final text answer
      while (iterations < MAX_ITERATIONS) {
        iterations++;

        const response = await boundModel.invoke(messages);
        // Add the model's response to the conversation history
        messages.push(response);

        // No tool calls → the model is done, return the final text
        if (!response.tool_calls || response.tool_calls.length === 0) {
          return typeof response.content === "string"
            ? response.content
            : JSON.stringify(response.content);
        }

        // Execute each requested tool and feed the results back
        for (const toolCall of response.tool_calls) {
          const tool = toolMap.get(toolCall.name);

          if (!tool) {
            messages.push(
              new ToolMessage({
                content: `Tool "${toolCall.name}" is not available.`,
                tool_call_id: toolCall.id ?? "",
              })
            );
            continue;
          }

          try {
            const result = await tool.invoke(toolCall.args as Parameters<typeof tool.invoke>[0]);
            messages.push(
              new ToolMessage({
                content: String(result),
                tool_call_id: toolCall.id ?? "",
              })
            );
          } catch (err) {
            messages.push(
              new ToolMessage({
                content: `Tool error: ${err instanceof Error ? err.message : String(err)}`,
                tool_call_id: toolCall.id ?? "",
              })
            );
          }
        }
      }

      throw new Error("Agent exceeded maximum iterations without producing a final answer.");
    },
  };
}
