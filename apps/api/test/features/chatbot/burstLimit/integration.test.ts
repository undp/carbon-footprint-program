import { describe, it, expect, beforeAll, afterAll, inject, vi } from "vitest";
import type { FastifyInstance } from "fastify";

// Turns accepted per minute by the app this file builds. Deliberately tiny:
// the suite-wide value in vitest.config.ts is raised to 1000 so no other file
// trips the limiter, so the only way to exercise the limit is to stand up an
// app that has its own.
const CAP = 2;

// Every request here carries an invalid body on purpose. @fastify/rate-limit
// runs in `onRequest`, which is strictly before Fastify validates the body, so
// a malformed request still consumes a bucket slot while returning 400 without
// ever reaching the handler. That lets the limit be tested without invoking the
// model, without hijacking a reply into an SSE stream, and without depending on
// the mock provider's routing at all.
const INVALID_BODY = { notTheExpectedField: true };

describe("POST /api/chatbot/message — burst limit", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // `environment.ts` reads process.env once at module load, so the override
    // has to be in place before the module graph is re-evaluated.
    vi.stubEnv("CHATBOT_MAX_TURNS_PER_MINUTE", String(CAP));
    vi.resetModules();
    const { createTestApp } = await import("@test/factories/appFactory.js");
    app = await createTestApp(inject("databaseUrl"));
  });

  afterAll(async () => {
    await app.prisma.chatbotChatConversation.deleteMany({});
    await app.prisma.$disconnect();
    await app.close();
    vi.unstubAllEnvs();
  });

  const send = () =>
    app.inject({
      method: "POST",
      url: "/api/chatbot/message",
      payload: INVALID_BODY,
    });

  it("refuses turns past the per-minute cap with 429", async () => {
    const withinCap = [];
    for (let i = 0; i < CAP; i += 1) {
      withinCap.push(await send());
    }

    // Consumed a slot each, and were rejected on their body rather than on the
    // limit — proving the limiter counted them without the handler running.
    for (const response of withinCap) {
      expect(response.statusCode).toBe(400);
    }

    const overCap = await send();
    expect(overCap.statusCode).toBe(429);
  });

  it("keeps refusing while the window is open", async () => {
    // The bucket is already exhausted by the previous test — the limiter's
    // store lives on the app instance, which this file builds once.
    const again = await send();
    expect(again.statusCode).toBe(429);
  });

  it("never reaches the model when the limit refuses", async () => {
    const refused = await send();

    expect(refused.statusCode).toBe(429);
    // A turn that reached the handler would have hijacked the reply and written
    // an SSE stream; a refusal is an ordinary JSON response.
    expect(refused.headers["content-type"]).not.toContain("text/event-stream");
    // And it left no trace in the conversation tables.
    const conversations = await app.prisma.chatbotChatConversation.count();
    expect(conversations).toBe(0);
  });
});
