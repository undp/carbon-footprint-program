import type { ChatMessageRole } from "@repo/database/enums";

export type LlmMessage = {
  role: ChatMessageRole;
  content: string;
};

export type LlmStreamEvent =
  | { type: "delta"; content: string }
  | { type: "usage"; inputTokens: number; outputTokens: number };

export type LlmStreamOptions = {
  maxOutputTokens: number;
  signal?: AbortSignal;
};

export interface LLMProvider {
  streamCompletion(
    messages: LlmMessage[],
    options: LlmStreamOptions
  ): AsyncIterable<LlmStreamEvent>;
}
