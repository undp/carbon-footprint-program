import { AzureOpenAI } from "openai";
import {
  DefaultAzureCredential,
  getBearerTokenProvider,
} from "@azure/identity";
import {
  AZURE_OPENAI_API_KEY,
  AZURE_OPENAI_EMBEDDING_API_VERSION,
  AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME,
  AZURE_OPENAI_ENDPOINT,
} from "@/config/environment.js";
import { estimateTokens } from "@/features/chatbot/llmProvider/estimateTokens.js";
import type {
  EmbedOptions,
  EmbeddingProvider,
  EmbeddingResult,
} from "./types.js";

const AZURE_COGNITIVE_SCOPE = "https://cognitiveservices.azure.com/.default";

const EMBEDDING_DIMENSIONS = 1024;

/** Azure embeddings hard ceiling per request (input array sum). */
const AZURE_EMBED_HARD_TOKEN_LIMIT = 8192;

/**
 * Internal batch threshold with 5% safety margin against Azure's 8192 hard
 * ceiling. Spanish technical prose with diacritics can mildly underestimate
 * against `cl100k_base`, so the margin absorbs the drift.
 */
const AZURE_EMBED_BATCH_TOKEN_THRESHOLD = Math.floor(
  AZURE_EMBED_HARD_TOKEN_LIMIT * 0.95
);

/** Azure embeddings array length cap per request. */
const AZURE_EMBED_BATCH_INPUT_LIMIT = 16;

const buildClient = (): AzureOpenAI => {
  if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME) {
    throw new Error(
      "AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME must be set when EMBEDDING_PROVIDER=azure-openai."
    );
  }
  if (AZURE_OPENAI_API_KEY) {
    return new AzureOpenAI({
      endpoint: AZURE_OPENAI_ENDPOINT,
      apiVersion: AZURE_OPENAI_EMBEDDING_API_VERSION,
      deployment: AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME,
      apiKey: AZURE_OPENAI_API_KEY,
    });
  }
  const credential = new DefaultAzureCredential();
  const azureADTokenProvider = getBearerTokenProvider(
    credential,
    AZURE_COGNITIVE_SCOPE
  );
  return new AzureOpenAI({
    endpoint: AZURE_OPENAI_ENDPOINT,
    apiVersion: AZURE_OPENAI_EMBEDDING_API_VERSION,
    deployment: AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME,
    azureADTokenProvider,
  });
};

let cachedClient: AzureOpenAI | null = null;

const getClient = (): AzureOpenAI => {
  if (!cachedClient) cachedClient = buildClient();
  return cachedClient;
};

class InputTooLargeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InputTooLargeError";
  }
}

const validatePerInputBudget = (texts: string[]): void => {
  for (let i = 0; i < texts.length; i++) {
    const tokens = estimateTokens(texts[i]);
    if (tokens > AZURE_EMBED_HARD_TOKEN_LIMIT) {
      throw new InputTooLargeError(
        `Input at index ${i} estimated at ${tokens} tokens exceeds the Azure embeddings hard limit of ${AZURE_EMBED_HARD_TOKEN_LIMIT}.`
      );
    }
  }
};

const buildBatches = (texts: string[]): string[][] => {
  const batches: string[][] = [];
  let current: string[] = [];
  let currentTokens = 0;
  for (const text of texts) {
    const tokens = estimateTokens(text);
    const wouldOverflowTokens =
      currentTokens + tokens > AZURE_EMBED_BATCH_TOKEN_THRESHOLD;
    const wouldOverflowSize = current.length >= AZURE_EMBED_BATCH_INPUT_LIMIT;
    if (current.length > 0 && (wouldOverflowTokens || wouldOverflowSize)) {
      batches.push(current);
      current = [];
      currentTokens = 0;
    }
    current.push(text);
    currentTokens += tokens;
  }
  if (current.length > 0) batches.push(current);
  return batches;
};

export const azureOpenAIEmbeddingProvider: EmbeddingProvider = {
  async embed(
    texts: string[],
    options?: EmbedOptions
  ): Promise<EmbeddingResult> {
    validatePerInputBudget(texts);
    // Construct the client BEFORE the empty-input fast path so a missing /
    // blank AZURE_OPENAI_ENDPOINT or AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME
    // surfaces as an error on every call path — otherwise embed([]) would
    // succeed against a misconfigured deployment and return model: "",
    // which violates the EmbeddingResult contract (model is non-empty).
    const client = getClient();
    if (texts.length === 0) {
      return {
        vectors: [],
        inputTokens: 0,
        model: AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME!,
      };
    }
    const batches = buildBatches(texts);
    const allVectors: number[][] = [];
    let totalInputTokens = 0;
    for (const batch of batches) {
      if (options?.signal?.aborted) {
        throw new Error("Embedding aborted");
      }
      const response = await client.embeddings.create(
        {
          input: batch,
          model: AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME!,
          dimensions: EMBEDDING_DIMENSIONS,
        },
        { signal: options?.signal }
      );
      for (const item of response.data) {
        allVectors.push(item.embedding);
      }
      totalInputTokens += response.usage?.prompt_tokens ?? 0;
    }
    return {
      vectors: allVectors,
      inputTokens: totalInputTokens,
      model: AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME!,
    };
  },
};

export {
  AZURE_EMBED_BATCH_TOKEN_THRESHOLD,
  AZURE_EMBED_BATCH_INPUT_LIMIT,
  AZURE_EMBED_HARD_TOKEN_LIMIT,
  InputTooLargeError,
};
