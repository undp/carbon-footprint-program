import { ChatMessageRole } from "@repo/database/enums";
import type { LLMProvider, LlmMessage, LlmStreamEvent } from "./types.js";
import { estimateTokens } from "./estimateTokens.js";

const findLatestUserMessage = (messages: LlmMessage[]): string => {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === ChatMessageRole.USER) {
      return messages[i].content;
    }
  }
  return "";
};

const splitIntoChunks = (text: string, minChunks: number): string[] => {
  const words = text.split(/(\s+)/).filter((part) => part.length > 0);
  if (words.length <= minChunks) return words;
  const chunkSize = Math.ceil(words.length / minChunks);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(""));
  }
  return chunks;
};

export const mockProvider: LLMProvider = {
  async *streamCompletion(messages, options): AsyncIterable<LlmStreamEvent> {
    const userMessage = findLatestUserMessage(messages);
    const output = `Recibí: ${userMessage}. Esta es una respuesta de mock.`;
    const chunks = splitIntoChunks(output, 3);
    const joinedInput = messages.map((m) => m.content).join("\n");

    for (const chunk of chunks) {
      if (options.signal?.aborted) return;
      // Yield to the event loop so consumers observe deltas as separate
      // microtasks — keeps the streaming behavior testable and lets the
      // signal propagate between chunks.
      await Promise.resolve();
      yield { type: "delta", content: chunk };
    }

    if (options.signal?.aborted) return;

    yield {
      type: "usage",
      inputTokens: estimateTokens(joinedInput),
      outputTokens: estimateTokens(output),
    };
  },
};
