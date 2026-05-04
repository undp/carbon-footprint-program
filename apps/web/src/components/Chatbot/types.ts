export type ChatbotState =
  | "empty"
  | "loading"
  | "streaming"
  | "error"
  | "truncated"
  | "degraded";

export type ChatbotMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  truncated?: boolean;
};

export type SendMessageResult =
  | { kind: "completed" }
  | { kind: "truncated" }
  | { kind: "error"; status?: number; code?: string; message: string }
  | { kind: "degraded" };
