import { EMBEDDING_PROVIDER } from "@/config/environment.js";
import { azureOpenAIEmbeddingProvider } from "./azureOpenAI.js";
import { mockEmbeddingProvider } from "./mock.js";
import type { EmbeddingProvider } from "./types.js";

let cached: EmbeddingProvider | null = null;

export const getEmbeddingProvider = (): EmbeddingProvider => {
  if (cached) return cached;
  cached =
    EMBEDDING_PROVIDER === "azure-openai"
      ? azureOpenAIEmbeddingProvider
      : mockEmbeddingProvider;
  return cached;
};

export type {
  EmbeddingProvider,
  EmbeddingResult,
  EmbedOptions,
} from "./types.js";
