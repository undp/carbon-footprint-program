import type { ChatMessageRole } from "@repo/database/enums";

/** A single tool call produced by the LLM in an assistant turn. */
export type LlmToolCall = {
  id: string;
  name: string;
  arguments: string;
};

/** Definition of a tool exposed to the model. */
export type LlmToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

/** Discriminated message union spanning all chat roles, including TOOL. */
export type LlmMessage =
  | {
      role: typeof ChatMessageRole.USER | typeof ChatMessageRole.SYSTEM;
      content: string;
    }
  | {
      role: typeof ChatMessageRole.ASSISTANT;
      content: string;
      toolCalls?: LlmToolCall[];
    }
  | {
      role: typeof ChatMessageRole.TOOL;
      content: string;
      toolCallId: string;
    };

export type LlmStreamEvent =
  | { type: "delta"; content: string }
  | { type: "tool_call"; id: string; name: string; arguments: string }
  | { type: "usage"; inputTokens: number; outputTokens: number };

export type LlmStreamOptions = {
  maxOutputTokens: number;
  signal?: AbortSignal;
  tools?: LlmToolDefinition[];
};

export interface LLMProvider {
  streamCompletion(
    messages: LlmMessage[],
    options: LlmStreamOptions
  ): AsyncIterable<LlmStreamEvent>;
}
