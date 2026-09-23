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
import { enforceTokenBudgets } from "@/features/chatbot/sendMessage/service.js";
import {
  CHATBOT_MAX_ANONYMOUS_TOKENS_PER_DAY,
  CHATBOT_MAX_TOKENS_PER_ANONYMOUS_IDENTITY_PER_DAY,
  CHATBOT_MAX_TOKENS_PER_AUTHENTICATED_IDENTITY_PER_DAY,
} from "@/config/constants.js";
import {
  CHATBOT_IDENTITY_BUDGET_MESSAGE,
  CHATBOT_SHARED_BUDGET_MESSAGE,
} from "@/features/chatbot/constants.js";

const hoursAgo = (hours: number): Date =>
  new Date(Date.now() - hours * 60 * 60 * 1000);

describe("chatbot token budgets — integration", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let userId: bigint;

  /** A conversation plus one assistant message carrying `tokensUsed`. */
  const spend = async (
    owner: { userId: bigint } | { sessionId: string },
    tokensUsed: number,
    createdAt: Date = new Date()
  ) => {
    const conversation = await prisma.chatbotChatConversation.create({
      data: {
        userId: "userId" in owner ? owner.userId : null,
        sessionId: "sessionId" in owner ? owner.sessionId : null,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt,
        lastMessageAt: createdAt,
      },
    });
    await prisma.chatbotChatMessage.create({
      data: {
        conversationId: conversation.id,
        role: ChatMessageRole.ASSISTANT,
        content: "respuesta",
        tokensUsed,
        createdAt,
      },
    });
  };

  beforeAll(async () => {
    app = await createTestApp(inject("databaseUrl"));
    prisma = app.prisma;
    const user = await prisma.user.findFirstOrThrow({ select: { id: true } });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.chatbotChatConversation.deleteMany({});
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.chatbotChatConversation.deleteMany({});
  });

  describe("per-identity budget", () => {
    it("allows a caller under the budget", async () => {
      await spend(
        { userId },
        CHATBOT_MAX_TOKENS_PER_AUTHENTICATED_IDENTITY_PER_DAY - 1
      );

      await expect(
        enforceTokenBudgets(prisma, { kind: "user", userId })
      ).resolves.toBeUndefined();
    });

    it("refuses a caller at or over the budget, naming their own limit", async () => {
      await spend(
        { userId },
        CHATBOT_MAX_TOKENS_PER_AUTHENTICATED_IDENTITY_PER_DAY
      );

      await expect(
        enforceTokenBudgets(prisma, { kind: "user", userId })
      ).rejects.toMatchObject({
        statusCode: 429,
        message: CHATBOT_IDENTITY_BUDGET_MESSAGE,
      });
    });

    it("does not count another identity's spend against this one", async () => {
      await spend(
        { sessionId: "someone-else" },
        CHATBOT_MAX_TOKENS_PER_AUTHENTICATED_IDENTITY_PER_DAY * 2
      );

      await expect(
        enforceTokenBudgets(prisma, { kind: "user", userId })
      ).resolves.toBeUndefined();
    });

    it("ignores spend older than the window", async () => {
      await spend(
        { userId },
        CHATBOT_MAX_TOKENS_PER_AUTHENTICATED_IDENTITY_PER_DAY * 2,
        hoursAgo(25)
      );

      await expect(
        enforceTokenBudgets(prisma, { kind: "user", userId })
      ).resolves.toBeUndefined();
    });
  });

  describe("budget by identity kind", () => {
    // The two kinds get different allowances on purpose: an account costs
    // something to mint and never draws on the shared pool, a cookie does not.
    it("refuses an anonymous caller at the anonymous budget", async () => {
      await spend(
        { sessionId: "anon" },
        CHATBOT_MAX_TOKENS_PER_ANONYMOUS_IDENTITY_PER_DAY
      );

      await expect(
        enforceTokenBudgets(prisma, { kind: "session", sessionId: "anon" })
      ).rejects.toMatchObject({ message: CHATBOT_IDENTITY_BUDGET_MESSAGE });
    });

    it("lets an authenticated caller spend past the anonymous budget", async () => {
      await spend(
        { userId },
        CHATBOT_MAX_TOKENS_PER_ANONYMOUS_IDENTITY_PER_DAY
      );

      await expect(
        enforceTokenBudgets(prisma, { kind: "user", userId })
      ).resolves.toBeUndefined();
    });

    it("gives authenticated callers the larger allowance", () => {
      expect(
        CHATBOT_MAX_TOKENS_PER_AUTHENTICATED_IDENTITY_PER_DAY
      ).toBeGreaterThan(CHATBOT_MAX_TOKENS_PER_ANONYMOUS_IDENTITY_PER_DAY);
    });
  });

  describe("shared anonymous pool", () => {
    it("refuses an anonymous caller once the pool is exhausted, naming the remedy", async () => {
      // Spread across several identities, each well under the per-identity
      // budget: this is the case the per-identity layer structurally cannot
      // catch, because discarding a cookie mints a fresh one for free.
      const perIdentity = CHATBOT_MAX_TOKENS_PER_ANONYMOUS_IDENTITY_PER_DAY / 2;
      const identitiesNeeded = Math.ceil(
        CHATBOT_MAX_ANONYMOUS_TOKENS_PER_DAY / perIdentity
      );
      for (let i = 0; i < identitiesNeeded; i += 1) {
        await spend({ sessionId: `burner-${i}` }, perIdentity);
      }

      await expect(
        enforceTokenBudgets(prisma, { kind: "session", sessionId: "fresh" })
      ).rejects.toMatchObject({
        statusCode: 429,
        message: CHATBOT_SHARED_BUDGET_MESSAGE,
      });
    });

    it("leaves authenticated callers unaffected by an exhausted pool", async () => {
      const perIdentity = CHATBOT_MAX_TOKENS_PER_ANONYMOUS_IDENTITY_PER_DAY / 2;
      const identitiesNeeded = Math.ceil(
        CHATBOT_MAX_ANONYMOUS_TOKENS_PER_DAY / perIdentity
      );
      for (let i = 0; i < identitiesNeeded; i += 1) {
        await spend({ sessionId: `burner-${i}` }, perIdentity);
      }

      // The asymmetry that makes "inicia sesión" a real remedy rather than
      // advice. If this ever fails, the pool's rejection message is a lie.
      await expect(
        enforceTokenBudgets(prisma, { kind: "user", userId })
      ).resolves.toBeUndefined();
    });

    it("does not count authenticated spend against the anonymous pool", async () => {
      await spend({ userId }, CHATBOT_MAX_ANONYMOUS_TOKENS_PER_DAY * 2);

      await expect(
        enforceTokenBudgets(prisma, { kind: "session", sessionId: "fresh" })
      ).resolves.toBeUndefined();
    });
  });

  describe("layer precedence", () => {
    it("reports the caller's own limit before the shared one", async () => {
      // Both are exhausted. The caller should hear about the one they can
      // reason about, not be told the shared pool is empty when it is their
      // own doing.
      await spend({ sessionId: "heavy" }, CHATBOT_MAX_ANONYMOUS_TOKENS_PER_DAY);

      await expect(
        enforceTokenBudgets(prisma, { kind: "session", sessionId: "heavy" })
      ).rejects.toMatchObject({ message: CHATBOT_IDENTITY_BUDGET_MESSAGE });
    });
  });

  describe("null token accounting", () => {
    it("treats unrecorded usage as zero rather than as consumption", async () => {
      const conversation = await prisma.chatbotChatConversation.create({
        data: {
          userId,
          sessionId: null,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          lastMessageAt: new Date(),
        },
      });
      await prisma.chatbotChatMessage.create({
        data: {
          conversationId: conversation.id,
          role: ChatMessageRole.USER,
          content: "pregunta",
          tokensUsed: null,
        },
      });

      await expect(
        enforceTokenBudgets(prisma, { kind: "user", userId })
      ).resolves.toBeUndefined();
    });
  });
});
