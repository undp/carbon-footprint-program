import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  inject,
} from "vitest";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { ChatMessageRole, SystemRole } from "@repo/database/enums";
import { createTestApp } from "@test/factories/appFactory.js";
import { CHATBOT_CONVERSATION_COOKIE_NAME } from "@/features/chatbot/helpers/conversationCookie.js";

const FUTURE = (): Date => new Date(Date.now() + 24 * 60 * 60 * 1000);
const PAST = (): Date => new Date(Date.now() - 60_000);

const signedConversationCookie = (
  app: FastifyInstance,
  conversationId: bigint
): string => {
  const signed = app.signCookie(conversationId.toString());
  return `${CHATBOT_CONVERSATION_COOKIE_NAME}=${signed}`;
};

const SAMPLE_SOURCE_CITED = [
  {
    source_id: "1",
    chunk_id: "7",
    cite_label: "GHG Protocol §2.3",
    cite_url: "https://ghgprotocol.org/corporate-standard",
    snippet: "Las emisiones de alcance 1...",
  },
];

describe("GET /api/chatbot/conversations/me/current — integration", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let forcedUserId: bigint;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
  });

  afterAll(async () => {
    await prisma.chatbotChatConversation.deleteMany({});
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.chatbotChatConversation.deleteMany({});
    // Resolve the forced-user id once. The userResolvePlugin lazy-creates the
    // row on the first authenticated request — pinging any chatbot route is
    // enough to materialize it, then we read the row back for direct seeding.
    await app.inject({
      method: "GET",
      url: "/api/chatbot/conversations/me/current",
    });
    const me = await prisma.user.findFirstOrThrow({
      where: { email: "me@test.com" },
      select: { id: true },
    });
    forcedUserId = me.id;
  });

  it("returns 204 when no cookie is present", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/chatbot/conversations/me/current",
    });
    expect(response.statusCode).toBe(204);
    expect(response.body).toBe("");
  });

  it("returns 200 with messages ordered ASC and sources_cited preserved (auth happy path)", async () => {
    const conversation = await prisma.chatbotChatConversation.create({
      data: {
        userId: forcedUserId,
        expiresAt: FUTURE(),
      },
    });
    // Insert messages in reverse-chronological order so the ordering assertion
    // is meaningful — if the handler returns whatever the DB volunteers it
    // would surface here.
    const second = await prisma.chatbotChatMessage.create({
      data: {
        conversationId: conversation.id,
        role: ChatMessageRole.ASSISTANT,
        content: "respuesta",
        sourcesCited: SAMPLE_SOURCE_CITED,
        tokensUsed: 99,
        latencyMs: 1234,
        truncated: false,
        createdAt: new Date(Date.now() - 1_000),
      },
    });
    const first = await prisma.chatbotChatMessage.create({
      data: {
        conversationId: conversation.id,
        role: ChatMessageRole.USER,
        content: "pregunta",
        createdAt: new Date(Date.now() - 2_000),
      },
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/chatbot/conversations/me/current",
      headers: { cookie: signedConversationCookie(app, conversation.id) },
    });
    expect(response.statusCode).toBe(200);
    const body: {
      conversation: { id: string; createdAt: string; expiresAt: string };
      messages: Array<{
        id: string;
        role: ChatMessageRole;
        content: string;
        sourcesCited: typeof SAMPLE_SOURCE_CITED;
        createdAt: string;
      }>;
    } = response.json();

    expect(body.conversation.id).toBe(conversation.id.toString());
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].id).toBe(first.id.toString());
    expect(body.messages[0].role).toBe(ChatMessageRole.USER);
    expect(body.messages[0].content).toBe("pregunta");
    expect(body.messages[0].sourcesCited).toEqual([]);
    expect(body.messages[1].id).toBe(second.id.toString());
    expect(body.messages[1].role).toBe(ChatMessageRole.ASSISTANT);
    expect(body.messages[1].sourcesCited).toEqual(SAMPLE_SOURCE_CITED);
    // Internal observability columns are intentionally not on the wire.
    expect(body.messages[1]).not.toHaveProperty("tokensUsed");
    expect(body.messages[1]).not.toHaveProperty("latencyMs");
    expect(body.messages[1]).not.toHaveProperty("truncated");
  });

  it("returns sources_cited as [] when the assistant turn was K=0", async () => {
    // K=0 assistant rows store `[]` in JSONB; the wire shape must mirror that
    // exactly (NOT `null`, NOT omitted) so the widget renders no panel.
    const conversation = await prisma.chatbotChatConversation.create({
      data: { userId: forcedUserId, expiresAt: FUTURE() },
    });
    await prisma.chatbotChatMessage.create({
      data: {
        conversationId: conversation.id,
        role: ChatMessageRole.ASSISTANT,
        content: "No dispongo de fuentes verificadas...",
        sourcesCited: [],
      },
    });
    const response = await app.inject({
      method: "GET",
      url: "/api/chatbot/conversations/me/current",
      headers: { cookie: signedConversationCookie(app, conversation.id) },
    });
    expect(response.statusCode).toBe(200);
    const body: { messages: Array<{ sourcesCited: unknown }> } =
      response.json();
    expect(body.messages[0].sourcesCited).toEqual([]);
  });

  it("returns 404 when the cookie points to an expired conversation", async () => {
    const conversation = await prisma.chatbotChatConversation.create({
      data: {
        userId: forcedUserId,
        expiresAt: PAST(),
      },
    });
    await prisma.chatbotChatMessage.create({
      data: {
        conversationId: conversation.id,
        role: ChatMessageRole.USER,
        content: "vieja",
      },
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/chatbot/conversations/me/current",
      headers: { cookie: signedConversationCookie(app, conversation.id) },
    });
    expect(response.statusCode).toBe(404);
    const setCookie = response.headers["set-cookie"];
    const cookieHeader = Array.isArray(setCookie)
      ? setCookie.join("; ")
      : (setCookie ?? "");
    // Expired → clear the stale cookie so the widget does not re-attempt
    // this lookup on every reload.
    expect(cookieHeader).toContain(CHATBOT_CONVERSATION_COOKIE_NAME);
    expect(cookieHeader).toContain("Max-Age=0");
  });

  it("returns 404 when the cookie points to a different user's conversation (IDOR check)", async () => {
    const otherUser = await prisma.user.create({
      data: {
        idpUserId: "other-user-idp-id",
        email: "other@test.com",
        idpName: "Otro",
        role: SystemRole.USER,
        updatedAt: null,
      },
    });
    const otherConversation = await prisma.chatbotChatConversation.create({
      data: {
        userId: otherUser.id,
        expiresAt: FUTURE(),
      },
    });
    const response = await app.inject({
      method: "GET",
      url: "/api/chatbot/conversations/me/current",
      headers: {
        cookie: signedConversationCookie(app, otherConversation.id),
      },
    });
    expect(response.statusCode).toBe(404);
  });

  it("returns 404 when the cookie points to an anonymous conversation and the request is authenticated (V1 anon→auth not supported)", async () => {
    // Per Decision 28: V1 does not support the anon → auth claim transition.
    // A user who started anonymously and then logs in receives 404 here, and
    // the client falls back to a new conversation.
    const anonConversation = await prisma.chatbotChatConversation.create({
      data: {
        userId: null,
        sessionId: "anon-session-from-before-login",
        expiresAt: FUTURE(),
      },
    });
    const response = await app.inject({
      method: "GET",
      url: "/api/chatbot/conversations/me/current",
      headers: {
        cookie: signedConversationCookie(app, anonConversation.id),
      },
    });
    expect(response.statusCode).toBe(404);
  });

  it("returns 404 when the cookie value is not signed by the server (tampered cookie)", async () => {
    const conversation = await prisma.chatbotChatConversation.create({
      data: {
        userId: forcedUserId,
        expiresAt: FUTURE(),
      },
    });
    // Raw (un-signed) value — readSignedConversationCookie rejects via
    // request.unsignCookie which sets `.valid = false`. The handler must treat
    // this identically to a missing cookie path (204) so a forged cookie can't
    // probe for a real id.
    const tampered = `${CHATBOT_CONVERSATION_COOKIE_NAME}=${conversation.id.toString()}`;
    const response = await app.inject({
      method: "GET",
      url: "/api/chatbot/conversations/me/current",
      headers: { cookie: tampered },
    });
    expect(response.statusCode).toBe(204);
  });

  it("returns 404 when the cookie is signed but the value is not a valid conversation id format", async () => {
    // Signed but malformed payload (e.g., non-numeric). Defensive parse in the
    // handler should refuse instead of trusting Prisma to throw on the bigint
    // coercion downstream.
    const malformed = app.signCookie("not-a-number");
    const response = await app.inject({
      method: "GET",
      url: "/api/chatbot/conversations/me/current",
      headers: {
        cookie: `${CHATBOT_CONVERSATION_COOKIE_NAME}=${malformed}`,
      },
    });
    expect(response.statusCode).toBe(404);
  });
});
