import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatMessageRole } from "@repo/database/enums";
import {
  buildClient,
  roleToOpenAi,
  streamChatCompletion,
} from "@/features/chatbot/llmProvider/azureOpenAI.js";
import { estimateTokens } from "@/features/chatbot/llmProvider/estimateTokens.js";
import type { LlmStreamEvent } from "@/features/chatbot/llmProvider/types.js";

// Unit tests for the Azure OpenAI provider's real logic — role/message
// transformation, delta streaming, usage/token computation, and the aborted-
// signal early return — driven through an injected fake client, so no live
// Azure endpoint or managed-identity credential is needed. LLM_PROVIDER=mock in
// the test env means this provider otherwise never runs in the suite.

type FakeChunk = {
  choices: Array<{ delta?: { content?: string } }>;
  usage?: { prompt_tokens: number; completion_tokens: number };
};

/** Fake OpenAI client whose `chat.completions.create` streams the given chunks. */
const makeClient = (chunks: FakeChunk[]) => {
  const bodies: Array<Record<string, unknown>> = [];
  const create = vi.fn((body: Record<string, unknown>) => {
    bodies.push(body);
    // A sync generator is fine — `for await` in the SUT awaits each value.
    return Promise.resolve(
      (function* () {
        for (const chunk of chunks) yield chunk;
      })()
    );
  });
  const client = {
    chat: { completions: { create } },
  } as unknown as Parameters<typeof streamChatCompletion>[0];
  return { client, create, bodies };
};

const collect = async (
  iterable: AsyncIterable<LlmStreamEvent>
): Promise<LlmStreamEvent[]> => {
  const events: LlmStreamEvent[] = [];
  for await (const event of iterable) events.push(event);
  return events;
};

describe("roleToOpenAi", () => {
  it.each([
    [ChatMessageRole.USER, "user"],
    [ChatMessageRole.ASSISTANT, "assistant"],
    [ChatMessageRole.SYSTEM, "system"],
    [ChatMessageRole.TOOL, "tool"],
  ])("maps %s to its OpenAI role", (role, expected) => {
    expect(roleToOpenAi(role)).toBe(expected);
  });
});

describe("streamChatCompletion", () => {
  it("streams content deltas then a terminal usage event from the chunk usage", async () => {
    const { client } = makeClient([
      { choices: [{ delta: { content: "Hola" } }] },
      { choices: [{ delta: { content: " mundo" } }] },
      { choices: [{}], usage: { prompt_tokens: 11, completion_tokens: 7 } },
    ]);

    const events = await collect(
      streamChatCompletion(
        client,
        [{ role: ChatMessageRole.USER, content: "hi" }],
        { maxOutputTokens: 100 }
      )
    );

    expect(events).toEqual([
      { type: "delta", content: "Hola" },
      { type: "delta", content: " mundo" },
      { type: "usage", inputTokens: 11, outputTokens: 7 },
    ]);
  });

  it("estimates the token usage when the stream omits a usage chunk", async () => {
    const { client } = makeClient([
      { choices: [{ delta: { content: "abc" } }] },
    ]);
    const messages = [{ role: ChatMessageRole.USER, content: "hello" }];

    const events = await collect(
      streamChatCompletion(client, messages, { maxOutputTokens: 50 })
    );

    expect(events).toContainEqual({
      type: "usage",
      inputTokens: estimateTokens("hello"),
      outputTokens: estimateTokens("abc"),
    });
  });

  it("skips empty deltas but still emits a terminal usage event", async () => {
    const { client } = makeClient([
      { choices: [{ delta: {} }] },
      { choices: [{ delta: { content: "" } }] },
      { choices: [{}] },
    ]);

    const events = await collect(
      streamChatCompletion(
        client,
        [{ role: ChatMessageRole.USER, content: "x" }],
        { maxOutputTokens: 10 }
      )
    );

    expect(events.filter((e) => e.type === "delta")).toHaveLength(0);
    expect(events.filter((e) => e.type === "usage")).toHaveLength(1);
  });

  it("coerces a TOOL-role message to a user message in the OpenAI payload", async () => {
    const { client, bodies } = makeClient([{ choices: [{}] }]);

    await collect(
      streamChatCompletion(
        client,
        [
          { role: ChatMessageRole.SYSTEM, content: "sys" },
          { role: ChatMessageRole.TOOL, content: "leaked tool msg" },
        ],
        { maxOutputTokens: 10 }
      )
    );

    expect(bodies[0]?.messages).toEqual([
      { role: "system", content: "sys" },
      { role: "user", content: "leaked tool msg" },
    ]);
  });

  it("returns without yielding when the caller's signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const { client, create } = makeClient([
      { choices: [{ delta: { content: "never" } }] },
    ]);

    const events = await collect(
      streamChatCompletion(
        client,
        [{ role: ChatMessageRole.USER, content: "x" }],
        { maxOutputTokens: 10, signal: controller.signal }
      )
    );

    expect(events).toHaveLength(0);
    // The SDK request is still created (with the merged signal) before the
    // per-chunk disconnect guard short-circuits the loop.
    expect(create).toHaveBeenCalledTimes(1);
  });
});

describe("buildClient", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("throws when the Azure endpoint/deployment are not configured", () => {
    // The test env sets neither AZURE_OPENAI_* variable.
    expect(() => buildClient()).toThrow(
      /must be set when LLM_PROVIDER=azure-openai/
    );
  });

  it("constructs a client when both endpoint and deployment are set", async () => {
    vi.stubEnv("AZURE_OPENAI_ENDPOINT", "https://example.openai.azure.com");
    vi.stubEnv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt4o");
    vi.resetModules();

    const mod = await import("@/features/chatbot/llmProvider/azureOpenAI.js");
    expect(() => mod.buildClient()).not.toThrow();
  });
});
