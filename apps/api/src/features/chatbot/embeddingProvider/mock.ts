import { createHash } from "node:crypto";
import { estimateTokens } from "@/features/chatbot/llmProvider/estimateTokens.js";
import type {
  EmbedOptions,
  EmbeddingProvider,
  EmbeddingResult,
} from "./types.js";

const MOCK_VECTOR_DIM = 1024;
const MOCK_MODEL_NAME = "mock-sha256-1024";

const FLOATS_PER_HASH = 8;
const HASH_ITERATIONS_PER_VECTOR = MOCK_VECTOR_DIM / FLOATS_PER_HASH;

/**
 * Expand a SHA-256 hash chain into a deterministic 1024-dim float vector.
 * Each iteration consumes the previous digest as the new input and reads
 * eight 32-bit floats from the digest.
 */
const expandToVector = (input: string): number[] => {
  const vector: number[] = new Array<number>(MOCK_VECTOR_DIM);
  let digest = createHash("sha256").update(input).digest();
  let offset = 0;
  for (let i = 0; i < HASH_ITERATIONS_PER_VECTOR; i++) {
    for (let j = 0; j < FLOATS_PER_HASH; j++) {
      const u32 = digest.readUInt32BE(j * 4);
      // Map u32 to roughly [-0.5, 0.5] (centered around 0) so the
      // normalization step has a non-zero chance of touching every component.
      vector[offset++] = u32 / 0xffffffff - 0.5;
    }
    digest = createHash("sha256").update(digest).digest();
  }
  return vector;
};

const normalizeInPlace = (vector: number[]): void => {
  let sumSquares = 0;
  for (let i = 0; i < vector.length; i++) {
    sumSquares += vector[i] * vector[i];
  }
  const norm = Math.sqrt(sumSquares);
  if (norm === 0) return;
  for (let i = 0; i < vector.length; i++) {
    vector[i] = vector[i] / norm;
  }
};

export const mockEmbeddingProvider: EmbeddingProvider = {
  async embed(
    texts: string[],
    options?: EmbedOptions
  ): Promise<EmbeddingResult> {
    // Test-only mechanism for asserting CLI behavior on embedding
    // failure (regression guard for chatbot-corpus-ingest spec scenario
    // "Audit row persists on failure with NULL completed_at"). Requires
    // NODE_ENV=test as a second-layer guard so an accidental env-var
    // set in staging is a no-op. The ingest CLI runs in a subprocess
    // (execSync), so vi.spyOn from the test process cannot reach this
    // module — an env var crossing the process boundary is the
    // simplest mechanism.
    //
    // DO NOT use this mechanism in any production code path.
    // See apps/api/test/features/chatbot/ingest/integration.test.ts.
    if (
      process.env.__TEST_FORCE_EMBEDDING_FAILURE === "true" &&
      process.env.NODE_ENV === "test"
    ) {
      throw new Error(
        "Mock embedding provider forced to fail via __TEST_FORCE_EMBEDDING_FAILURE (test-only)"
      );
    }

    const vectors: number[][] = [];
    let inputTokens = 0;
    for (const text of texts) {
      if (options?.signal?.aborted) {
        throw new Error("Embedding aborted");
      }
      const vector = expandToVector(text);
      normalizeInPlace(vector);
      vectors.push(vector);
      inputTokens += estimateTokens(text);
      // Yield to the check phase (macrotask) between iterations so an
      // AbortController.abort() scheduled via a timer / IO callback is
      // observed promptly. `await Promise.resolve()` only drains microtasks
      // which would not see a timer-driven abort until the next loop turn.
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
    return {
      vectors,
      inputTokens,
      model: MOCK_MODEL_NAME,
    };
  },
};
