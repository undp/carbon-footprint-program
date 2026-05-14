import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { mockEmbeddingProvider } from "@/features/chatbot/embeddingProvider/mock.js";

const FORBIDDEN_NETWORK_IMPORTS = [
  "openai",
  "node:https",
  "node:fetch",
  "https",
  "node-fetch",
  "axios",
];

// Hoisted spy shared between the vi.mock factory and the test bodies.
// vi.hoisted runs alongside vi.mock at the top of the file (before any
// import), so the AzureOpenAI stub returned by the mock factory can
// reference the same vi.fn() instance the tests assert on. The
// constructor itself is a real class (not a vi.fn().mockImplementation)
// because Vitest 4 enforces [[Construct]] strictly: an arrow-function
// impl cannot be invoked via `new`. The class form sidesteps that —
// we don't need to spy on the constructor anyway, only on
// embeddings.create.
const { embeddingsCreate } = vi.hoisted(() => ({
  embeddingsCreate: vi.fn(),
}));

vi.mock("openai", () => {
  class MockAzureOpenAI {
    public embeddings = { create: embeddingsCreate };
  }
  return { AzureOpenAI: MockAzureOpenAI };
});

// Defensive mock of @azure/identity so that even the managed-identity
// branch (no AZURE_OPENAI_API_KEY) cannot reach Azure during tests. The
// returned tokenProvider is a no-op promise — the real provider would
// otherwise attempt to mint a bearer token against
// https://cognitiveservices.azure.com/ at first call.
vi.mock("@azure/identity", () => ({
  DefaultAzureCredential: vi.fn(),
  getBearerTokenProvider: vi.fn(() => () => Promise.resolve("fake-token")),
}));

describe("mockEmbeddingProvider", () => {
  it("returns 1024-dim vectors for every input", async () => {
    const inputs = ["alfa", "beta", "gamma", "delta", "epsilon"];
    const result = await mockEmbeddingProvider.embed(inputs);
    expect(result.vectors).toHaveLength(inputs.length);
    for (const v of result.vectors) {
      expect(v).toHaveLength(1024);
    }
  });

  it("returns L2-normalized vectors", async () => {
    const result = await mockEmbeddingProvider.embed([
      "alfa",
      "beta",
      "gamma",
      "delta",
      "epsilon",
    ]);
    for (const v of result.vectors) {
      const sumSquares = v.reduce((acc, x) => acc + x * x, 0);
      expect(Math.abs(sumSquares - 1)).toBeLessThan(1e-6);
    }
  });

  it("is deterministic across two calls with the same input", async () => {
    const a = await mockEmbeddingProvider.embed(["protocolo"]);
    const b = await mockEmbeddingProvider.embed(["protocolo"]);
    expect(a.vectors[0]).toEqual(b.vectors[0]);
  });

  it("produces different vectors for different inputs", async () => {
    const a = await mockEmbeddingProvider.embed(["alfa"]);
    const b = await mockEmbeddingProvider.embed(["beta"]);
    expect(a.vectors[0]).not.toEqual(b.vectors[0]);
  });

  it("model is the documented mock identifier", async () => {
    const result = await mockEmbeddingProvider.embed(["alfa"]);
    expect(result.model).toBe("mock-sha256-1024");
  });

  it("throws when the AbortSignal aborts before the call", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      mockEmbeddingProvider.embed(["alfa"], { signal: controller.signal })
    ).rejects.toThrow();
  });
});

describe("mockEmbeddingProvider source — no network imports", () => {
  it("does not import network modules", () => {
    const repoRoot = resolve(import.meta.dirname, "../../../../../..");
    const file = readFileSync(
      resolve(
        repoRoot,
        "apps/api/src/features/chatbot/embeddingProvider/mock.ts"
      ),
      "utf8"
    );
    for (const mod of FORBIDDEN_NETWORK_IMPORTS) {
      expect(file).not.toContain(`from "${mod}"`);
      expect(file).not.toContain(`from '${mod}'`);
      expect(file).not.toContain(`require("${mod}")`);
    }
  });
});

// The remaining describes need to override process.env per test and
// re-evaluate the environment.ts module (which captures env vars at
// load time). vi.resetModules in beforeEach + dynamic imports inside
// each test give us fresh module state. process.env is snapshotted in
// ORIGINAL_ENV at file load and restored in afterEach so a misconfigured
// test cannot leak env state into the next.
const ORIGINAL_ENV = { ...process.env };

describe("EMBEDDING_PROVIDER boot guard and factory selection", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  // Maps to chatbot-corpus-embeddings spec scenario "Mock provider in
  // production fails at boot":
  //   EMBEDDING_PROVIDER=mock + NODE_ENV=production SHALL throw at
  //   environment.ts evaluation time (the boot guard is the first
  //   line of defense against silent corpus corruption — the mock
  //   returns SHA-256-derived vectors with no semantic relation to
  //   the input text).
  //
  // The test must override LLM_PROVIDER too, because environment.ts
  // checks the LLM guard BEFORE the embedding guard — if LLM_PROVIDER
  // were left at the file's default of "mock", the LLM-mock-in-prod
  // guard would throw first and the embedding guard would never
  // execute. AZURE_OPENAI_ENDPOINT + AZURE_OPENAI_DEPLOYMENT_NAME +
  // COOKIE_SECRET satisfy the other prod-mode requirements so the
  // embedding guard is reached.
  it("rejects EMBEDDING_PROVIDER=mock at boot when NODE_ENV=production", async () => {
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: "production",
      COOKIE_SECRET: "test-cookie-secret-do-not-use-in-prod",
      LLM_PROVIDER: "azure-openai",
      AZURE_OPENAI_ENDPOINT: "https://test.openai.azure.com",
      AZURE_OPENAI_DEPLOYMENT_NAME: "chat-deployment",
      AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME: "embed-deployment",
      EMBEDDING_PROVIDER: "mock",
    };
    await expect(import("@/config/environment.js")).rejects.toThrow(
      /EMBEDDING_PROVIDER.*mock.*production/
    );
  });

  // Maps to chatbot-corpus-embeddings spec requirement
  // "getEmbeddingProvider factory selection". Three sub-cases:
  //   - mock when EMBEDDING_PROVIDER=mock (in non-prod)
  //   - azureOpenAI when EMBEDDING_PROVIDER=azure-openai
  //   - throw at boot when value is invalid (e.g., 'banana')

  it("getEmbeddingProvider returns the mock provider when EMBEDDING_PROVIDER=mock", async () => {
    process.env = { ...ORIGINAL_ENV, EMBEDDING_PROVIDER: "mock" };
    const factory = await import(
      "@/features/chatbot/embeddingProvider/index.js"
    );
    const mockModule = await import(
      "@/features/chatbot/embeddingProvider/mock.js"
    );
    // Identity comparison: factory caches and returns the same
    // reference exported from mock.ts. Both dynamic imports resolve to
    // the same module instance after the resetModules above.
    expect(factory.getEmbeddingProvider()).toBe(
      mockModule.mockEmbeddingProvider
    );
  });

  it("getEmbeddingProvider returns the azureOpenAI provider when EMBEDDING_PROVIDER=azure-openai", async () => {
    process.env = {
      ...ORIGINAL_ENV,
      EMBEDDING_PROVIDER: "azure-openai",
      AZURE_OPENAI_ENDPOINT: "https://test.openai.azure.com",
      AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME: "embed-deployment",
      AZURE_OPENAI_API_KEY: "fake-key",
    };
    const factory = await import(
      "@/features/chatbot/embeddingProvider/index.js"
    );
    const azureModule = await import(
      "@/features/chatbot/embeddingProvider/azureOpenAI.js"
    );
    expect(factory.getEmbeddingProvider()).toBe(
      azureModule.azureOpenAIEmbeddingProvider
    );
  });

  it("throws on invalid EMBEDDING_PROVIDER value 'banana'", async () => {
    process.env = { ...ORIGINAL_ENV, EMBEDDING_PROVIDER: "banana" };
    await expect(import("@/config/environment.js")).rejects.toThrow(
      /EMBEDDING_PROVIDER.*banana/
    );
  });
});

describe("azureOpenAIEmbeddingProvider — batcher contract", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...ORIGINAL_ENV,
      EMBEDDING_PROVIDER: "azure-openai",
      AZURE_OPENAI_ENDPOINT: "https://test.openai.azure.com",
      AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME: "embed-deployment",
      AZURE_OPENAI_API_KEY: "fake-key",
    };
    embeddingsCreate.mockReset();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  // Maps to chatbot-corpus-embeddings spec scenario "Azure batcher
  // splits on the per-request array-size cap":
  //   when input array length > 16, SHALL issue >=2 SDK calls, none
  //   exceeding 16 entries (Azure embeddings endpoint cap).
  //
  // The cumulative token sum here is small (17 * 1 token = 17 tokens),
  // far below both the internal threshold (7782) and the hard cap
  // (8192) — so the splitter is exercised on the count axis alone.
  it("splits on 17+ inputs even when token sum is small", async () => {
    embeddingsCreate.mockImplementation(
      (args: { input: string[] }): Promise<unknown> =>
        Promise.resolve({
          data: args.input.map(() => ({
            embedding: new Array(1024).fill(0) as number[],
          })),
          usage: { prompt_tokens: args.input.length },
        })
    );

    const { azureOpenAIEmbeddingProvider } = await import(
      "@/features/chatbot/embeddingProvider/azureOpenAI.js"
    );
    const inputs = Array.from({ length: 17 }, (_, i) => `t${i}`);
    await azureOpenAIEmbeddingProvider.embed(inputs);

    expect(embeddingsCreate).toHaveBeenCalledTimes(2);
    // No SDK call exceeded the per-request array-size cap of 16.
    for (const call of embeddingsCreate.mock.calls) {
      const args = call[0] as { input: string[] };
      expect(args.input.length).toBeLessThanOrEqual(16);
    }
  });

  // Maps to chatbot-corpus-embeddings spec scenario "Azure batcher
  // splits on cumulative token threshold":
  //   when cumulative estimateTokens over a batch would exceed the
  //   internal threshold (floor(8192 * 0.95) = 7782, 5% safety margin
  //   below the Azure hard cap of 8192), the batcher SHALL push the
  //   current batch and start a new one. No single SDK call's
  //   cumulative input tokens SHALL exceed the 8192 hard cap.
  //
  // Each input is 4000 chars → estimateTokens = ceil(4000/4) = 1000.
  // Ten such inputs = 10 000 cumulative tokens, comfortably above the
  // 7782 internal threshold, so the splitter has to fire.
  it("splits on token cap even with few inputs", async () => {
    embeddingsCreate.mockImplementation(
      (args: { input: string[] }): Promise<unknown> =>
        Promise.resolve({
          data: args.input.map(() => ({
            embedding: new Array(1024).fill(0) as number[],
          })),
          usage: { prompt_tokens: 100 },
        })
    );

    const { azureOpenAIEmbeddingProvider } = await import(
      "@/features/chatbot/embeddingProvider/azureOpenAI.js"
    );
    const inputs = Array.from({ length: 10 }, () => "a".repeat(4000));
    await azureOpenAIEmbeddingProvider.embed(inputs);

    // At least two SDK calls — the splitter fired on the token cap.
    expect(embeddingsCreate.mock.calls.length).toBeGreaterThanOrEqual(2);
    // No single SDK call's input cumulative tokens exceeded the 8192
    // Azure hard cap. The internal threshold (7782) is the value the
    // batcher actually enforces, but the assertion uses 8192 — both
    // because that matches the spec wording ("no call exceeded the
    // 8192-token sum") and because a regression that pushed the
    // threshold above the hard cap is the failure mode the test
    // guards against.
    for (const call of embeddingsCreate.mock.calls) {
      const args = call[0] as { input: string[] };
      const cumulativeTokens = args.input.reduce(
        (sum, t) => sum + Math.ceil(t.length / 4),
        0
      );
      expect(cumulativeTokens).toBeLessThanOrEqual(8192);
    }
  });

  // Maps to chatbot-corpus-embeddings spec scenario "Per-input
  // budget rejection":
  //   a single input whose estimateTokens > AZURE_EMBED_HARD_TOKEN_LIMIT
  //   (8192) SHALL throw InputTooLargeError whose message names the
  //   offending input's index, AND zero SDK calls SHALL fire (the
  //   check pre-empts the SDK invocation entirely — an Azure HTTP
  //   400 round-trip would be opaque, slower, and chargeable).
  //
  // Inputs: [shortInput, oversizedInput] — oversized at index 1.
  // shortInput = "ok" → ceil(2/4) = 1 token. oversizedInput =
  // "a".repeat(36000) → ceil(36000/4) = 9000 tokens > 8192. The
  // validatePerInputBudget loop iterates index 0 (passes) then index
  // 1 (throws), so the error message names "index 1".
  it("rejects single oversized input with InputTooLargeError before any SDK call", async () => {
    const { azureOpenAIEmbeddingProvider } = await import(
      "@/features/chatbot/embeddingProvider/azureOpenAI.js"
    );

    const shortInput = "ok";
    const oversizedInput = "a".repeat(36000);

    let caught: unknown;
    try {
      await azureOpenAIEmbeddingProvider.embed([shortInput, oversizedInput]);
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeDefined();
    expect((caught as Error).name).toBe("InputTooLargeError");
    // Message names the offending input's index AND its estimated
    // token count, per the spec scenario wording. Asserts both load-
    // bearing substrings rather than the full literal so a future
    // wording polish doesn't break this guard.
    expect((caught as Error).message).toContain("index 1");
    expect((caught as Error).message).toContain("8192");

    // ZERO SDK calls fired — the per-input check runs BEFORE
    // getClient() resolves and before any batcher SDK invocation.
    expect(embeddingsCreate).not.toHaveBeenCalled();
  });
});
