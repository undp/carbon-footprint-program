import type { SourceCitationWire } from "@repo/types";

export type ChatbotState =
  "empty" | "loading" | "streaming" | "error" | "truncated" | "degraded";

export type ChatbotMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  truncated?: boolean;
  // Set when `content` holds an error notice (unreachable server, degraded,
  // too-large, or a mid-stream failure) rather than a real assistant reply.
  // MessageBubble renders these with distinct error styling.
  error?: boolean;
  // Corpus chunks the assistant cited for this turn (RAG). Absent on user
  // messages, on error notices, and when retrieval returned nothing.
  sourcesCited?: SourceCitationWire[];
};

export type SendMessageResult =
  | { kind: "completed" }
  | { kind: "truncated" }
  | { kind: "error"; status?: number; code?: string; message: string }
  | { kind: "degraded" };
