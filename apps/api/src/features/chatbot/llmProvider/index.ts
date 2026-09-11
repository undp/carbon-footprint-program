import { LLM_PROVIDER } from "@/config/environment.js";
import { mockProvider } from "./mock.js";
import { azureOpenAIProvider } from "./azureOpenAI.js";
import type { LLMProvider } from "./types.js";

let cached: LLMProvider | null = null;

export const getLlmProvider = (): LLMProvider => {
  if (cached) return cached;
  cached = LLM_PROVIDER === "azure-openai" ? azureOpenAIProvider : mockProvider;
  return cached;
};

export type {
  LLMProvider,
  LlmMessage,
  LlmStreamEvent,
  LlmStreamOptions,
  LlmToolCall,
  LlmToolDefinition,
} from "./types.js";
export { estimateTokens } from "./estimateTokens.js";
