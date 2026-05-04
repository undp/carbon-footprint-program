import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ChatMessageRole } from "@repo/database/enums";
import { mockProvider } from "@/features/chatbot/llmProvider/mock.js";
import { estimateTokens } from "@/features/chatbot/llmProvider/estimateTokens.js";

describe("estimateTokens helper", () => {
  it("returns 0 for the empty string", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("returns 3 for 'hola mundo' (10 chars / 4 rounded up)", () => {
    expect(estimateTokens("hola mundo")).toBe(3);
  });
});

describe("mockProvider", () => {
  it("yields at least three deltas plus a final usage event", async () => {
    const events: Array<
      | { type: "delta"; content: string }
      | { type: "usage"; inputTokens: number; outputTokens: number }
    > = [];
    for await (const event of mockProvider.streamCompletion(
      [{ role: ChatMessageRole.USER, content: "hola" }],
      { maxOutputTokens: 100 }
    )) {
      events.push(event);
    }
    const deltas = events.filter((e) => e.type === "delta");
    const usage = events.filter((e) => e.type === "usage");
    expect(deltas.length).toBeGreaterThanOrEqual(3);
    expect(usage).toHaveLength(1);
    const concatenated = deltas
      .map((e) => (e.type === "delta" ? e.content : ""))
      .join("");
    expect(concatenated).toBe("Recibí: hola. Esta es una respuesta de mock.");
  });

  it("computes usage via estimateTokens helper", async () => {
    const messages = [{ role: ChatMessageRole.USER, content: "hola" }];
    const events: Array<
      | { type: "delta"; content: string }
      | { type: "usage"; inputTokens: number; outputTokens: number }
    > = [];
    for await (const event of mockProvider.streamCompletion(messages, {
      maxOutputTokens: 100,
    })) {
      events.push(event);
    }
    const usage = events.find((e) => e.type === "usage");
    expect(usage).toBeDefined();
    if (!usage || usage.type !== "usage") {
      throw new Error(
        "expected mockProvider to yield exactly one terminal usage event"
      );
    }
    const expectedOutput = "Recibí: hola. Esta es una respuesta de mock.";
    const joinedInput = messages.map((m) => m.content).join("\n");
    expect(usage.inputTokens).toBe(estimateTokens(joinedInput));
    expect(usage.outputTokens).toBe(estimateTokens(expectedOutput));
  });

  it("stops iterating when the AbortSignal aborts", async () => {
    const controller = new AbortController();
    controller.abort();
    const events: unknown[] = [];
    for await (const event of mockProvider.streamCompletion(
      [{ role: ChatMessageRole.USER, content: "hola" }],
      { maxOutputTokens: 100, signal: controller.signal }
    )) {
      events.push(event);
    }
    expect(events).toHaveLength(0);
  });
});

describe("mockProvider source — no network imports", () => {
  it("does not import openai, https, fetch, or axios in mock.ts", () => {
    const repoRoot = resolve(import.meta.dirname, "../../../../../..");
    const file = readFileSync(
      resolve(repoRoot, "apps/api/src/features/chatbot/llmProvider/mock.ts"),
      "utf8"
    );
    const forbidden = [
      "openai",
      "node:https",
      "node:fetch",
      "node-fetch",
      "axios",
    ];
    for (const mod of forbidden) {
      expect(file).not.toContain(`from "${mod}"`);
      expect(file).not.toContain(`from '${mod}'`);
      expect(file).not.toContain(`require("${mod}")`);
    }
  });
});
