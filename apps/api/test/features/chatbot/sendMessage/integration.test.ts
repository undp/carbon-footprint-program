import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  inject,
} from "vitest";
import { ChatMessageRole } from "@repo/database/enums";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { createTestApp } from "@test/factories/appFactory.js";
import { collectSseEvents } from "@test/helpers/sse.js";
import { CHATBOT_GENERIC_ERROR_MESSAGE } from "@/features/chatbot/constants.js";
import { estimateTokens } from "@/features/chatbot/llmProvider/estimateTokens.js";

describe("POST /api/chatbot/message — integration", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
    // SSE helper requires the server to be listening on a real port.
    await app.listen({ port: 0, host: "127.0.0.1" });
  });

  afterAll(async () => {
    await prisma.chatbotChatConversation.deleteMany({});
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.chatbotChatConversation.deleteMany({});
  });

  it("authenticated happy path: streams ≥3 deltas and a terminal done event", async () => {
    // The vitest global setup uses AUTH_PROVIDER=forced-user, so this request
    // resolves to an authenticated identity (`{ kind: "user", userId }`). The
    // identity preHandler does not mint a session cookie for authenticated
    // callers — the cookie path is reserved for the anonymous flow, which
    // requires `withAnonymousIdentity` (out of scope for foundation tests).
    const { status, events } = await collectSseEvents(
      app,
      "/api/chatbot/message",
      { content: "hola" },
      {
        // The suite owns the Fastify lifecycle (listen/close in
        // beforeAll/afterAll) — the helper must not close it under us.
        ownsApp: false,
      }
    );

    expect(status).toBe(200);
    const deltas = events.filter((e) => !e.event);
    const doneEvents = events.filter((e) => e.event === "done");
    expect(deltas.length).toBeGreaterThanOrEqual(3);
    expect(doneEvents).toHaveLength(1);
    const done = doneEvents[0].data as {
      inputTokens: number;
      outputTokens: number;
    };
    expect(done.inputTokens).toBeGreaterThanOrEqual(0);
    expect(done.outputTokens).toBeGreaterThanOrEqual(0);

    // Conversation row created — scoped to the authenticated user.
    const conversations = await prisma.chatbotChatConversation.findMany();
    expect(conversations).toHaveLength(1);
    expect(conversations[0].userId).not.toBeNull();
    expect(conversations[0].sessionId).toBeNull();

    const messages = await prisma.chatbotChatMessage.findMany({
      orderBy: { id: "asc" },
    });
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe(ChatMessageRole.USER);
    expect(messages[0].tokensUsed).toBeNull();
    expect(messages[1].role).toBe(ChatMessageRole.ASSISTANT);
    expect(messages[1].tokensUsed).not.toBeNull();
    expect(messages[1].latencyMs).not.toBeNull();
    expect(messages[1].truncated).toBe(false);

    // Per-turn cost = inputTokens + outputTokens — matches estimateTokens.
    const expectedOutputTokens = estimateTokens(
      "Recibí: hola. Esta es una respuesta de mock."
    );
    expect(messages[1].tokensUsed).toBe(done.inputTokens + done.outputTokens);
    expect(done.outputTokens).toBe(expectedOutputTokens);
  });

  it("rejects oversized user input via Zod max-length validation", async () => {
    // The body schema's `.max(CHATBOT_MAX_USER_INPUT_TOKENS * 4)` (= 16000)
    // ceiling fires before the handler's token-cap check, so this surfaces
    // as a 400 from Fastify's validation pipeline. The handler's 413 path
    // would only be reached if the Zod max were widened — left to V1 along
    // with the handler-driven oversized-history scenario.
    const oversized = "a".repeat(16001);
    const response = await app.inject({
      method: "POST",
      url: "/api/chatbot/message",
      payload: { content: oversized },
    });
    expect(response.statusCode).toBe(400);
  });

  it("rejects malformed body with 400", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/chatbot/message",
      payload: { wrongField: "x" },
    });
    expect(response.statusCode).toBe(400);
  });

  it("CHATBOT_GENERIC_ERROR_MESSAGE has the expected Spanish text", () => {
    // Pinned constant value test — the streaming handler imports this
    // constant by name and tests assert against it instead of duplicating
    // the literal string. End-to-end coverage of the 503 / mid-stream error
    // wire (which actually round-trips this message) requires triggering
    // the configured LLMProvider to fail; that scenario is covered by V1
    // when a non-deterministic provider is wired in.
    expect(CHATBOT_GENERIC_ERROR_MESSAGE).toBe(
      "El asistente no está disponible en este momento. Por favor intenta nuevamente."
    );
  });
});
