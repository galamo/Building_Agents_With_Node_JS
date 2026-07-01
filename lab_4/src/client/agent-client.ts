export interface AgentApiResponse {
  input: string;
  route: {
    category: string;
    reasoning: string;
  };
  selectedAgent: string;
  answer: string;
}

const BASE_URL = process.env.AGENT_API_BASE_URL || "http://localhost:3000";

/**
 * callAgentApi — sends a message to the agent server and returns the result.
 * Uses native Node.js fetch (Node 18+). No extra HTTP library needed.
 */
export async function callAgentApi(message: string): Promise<AgentApiResponse> {
  const response = await fetch(`${BASE_URL}/api/agent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(`Agent API failed [${response.status}]: ${JSON.stringify(body)}`);
  }

  return response.json() as Promise<AgentApiResponse>;
}
