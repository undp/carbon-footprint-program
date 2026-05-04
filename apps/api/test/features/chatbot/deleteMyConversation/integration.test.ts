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
import { ChatMessageRole } from "@repo/database/enums";
import { createTestApp } from "@test/factories/appFactory.js";

describe("DELETE /api/chatbot/conversations/me — integration", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

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
  });

  it("returns 204 with no Set-Cookie when caller has no identity", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/api/chatbot/conversations/me",
    });
    expect(response.statusCode).toBe(204);
    const setCookie = response.headers["set-cookie"];
    if (Array.isArray(setCookie)) {
      expect(setCookie.some((c) => c.includes("chatbot_session_id"))).toBe(
        false
      );
    } else if (typeof setCookie === "string") {
      expect(setCookie).not.toContain("chatbot_session_id");
    }
  });

  it("idempotent — returns 204 with no rows", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/api/chatbot/conversations/me",
    });
    expect(response.statusCode).toBe(204);
    expect(await prisma.chatbotChatConversation.count()).toBe(0);
  });

  it("cascade removes message rows when a conversation is deleted (via raw SQL)", async () => {
    const conversation = await prisma.chatbotChatConversation.create({
      data: {
        sessionId: "test-session-cascade",
        expiresAt: new Date(Date.now() + 10_000),
      },
    });
    await prisma.chatbotChatMessage.create({
      data: {
        conversationId: conversation.id,
        role: ChatMessageRole.USER,
        content: "x",
      },
    });
    await prisma.chatbotChatConversation.delete({
      where: { id: conversation.id },
    });
    expect(
      await prisma.chatbotChatMessage.count({
        where: { conversationId: conversation.id },
      })
    ).toBe(0);
  });
});
