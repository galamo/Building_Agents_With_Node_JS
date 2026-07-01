import type { RouteDecision } from "./classifier/classifier.types";

export interface MultiAgentResult {
  input: string;
  route: RouteDecision;
  selectedAgent: string;
  answer: string;
}
