import { describe, it, expect } from "vitest";
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
