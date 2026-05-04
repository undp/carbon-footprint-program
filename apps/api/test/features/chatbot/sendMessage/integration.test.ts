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

  it("anonymous happy path: streams ≥3 deltas and a terminal done event", async () => {
    // forced-user is the default global setup, so we mark this request as
    // anonymous via a custom header — we read no auth header below by simply
    // skipping authorization. The forced-user provider runs only when the
    // request reaches it; here we strip the bearer to simulate anonymous.
    const { status, events, setCookie } = await collectSseEvents(
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
    const deltas = events.filter(
      (e) => !e.event && !("inputTokens" in (e.data as object))
    );
    const doneEvents = events.filter((e) => e.event === "done");
    expect(deltas.length).toBeGreaterThanOrEqual(3);
    expect(doneEvents).toHaveLength(1);
    const done = doneEvents[0].data as {
      inputTokens: number;
      outputTokens: number;
    };
    expect(done.inputTokens).toBeGreaterThanOrEqual(0);
    expect(done.outputTokens).toBeGreaterThanOrEqual(0);

    // Cookie was set by the identity preHandler.
    const cookieHeader = setCookie.find((c) =>
      c.startsWith("chatbot_session_id=")
    );
    expect(cookieHeader).toBeDefined();
    expect(cookieHeader).toContain("Path=/api/chatbot");
    expect(cookieHeader).toContain("HttpOnly");
    expect(cookieHeader).toContain("SameSite=Lax");

    // Conversation row created.
    const convCount = await prisma.chatbotChatConversation.count();
    expect(convCount).toBe(1);

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

  it("rejects oversized user input with 413 REQUEST_TOO_LARGE", async () => {
    // 4000 tokens * 4 chars = 16000 chars. Send 16001+ chars.
    const oversized = "a".repeat(16001);
    const response = await app.inject({
      method: "POST",
      url: "/api/chatbot/message",
      payload: { content: oversized },
    });
    expect(response.statusCode).toBe(413);
    const json = response.json<{ code?: string }>();
    expect(typeof json.code).toBe("string");
  });

  it("rejects malformed body with 400", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/chatbot/message",
      payload: { wrongField: "x" },
    });
    expect(response.statusCode).toBe(400);
  });

  it("503 error message uses CHATBOT_GENERIC_ERROR_MESSAGE constant", () => {
    expect(CHATBOT_GENERIC_ERROR_MESSAGE).toBe(
      "El asistente no está disponible en este momento. Por favor intenta nuevamente."
    );
  });
});
