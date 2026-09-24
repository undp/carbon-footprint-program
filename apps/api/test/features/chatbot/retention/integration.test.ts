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
import { createTestApp } from "@test/factories/appFactory.js";
import { createConversation } from "@/features/chatbot/sendMessage/service.js";
import {
  CHATBOT_ANONYMOUS_CONVERSATION_TTL_DAYS,
  CHATBOT_CONVERSATION_TTL_DAYS,
} from "@/config/constants.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Tolerance for the round trip through the database's timestamp precision. */
const SLACK_MS = 60_000;

const daysBetween = (later: Date, earlier: Date): number =>
  (later.getTime() - earlier.getTime()) / DAY_MS;

/**
 * Exercised at the service rather than over HTTP: the suite runs with
 * AUTH_PROVIDER=forced-user, so every request resolves to an authenticated
 * caller and the anonymous branch is unreachable from the wire. The branch is
 * what this file is about, so it is called directly with both identity shapes.
 */
describe("chatbot retention is tiered by identity kind", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  // Taken from the seeded database rather than invented: `user_id` carries a
  // foreign key, so a made-up id fails on the constraint instead of on the
  // behaviour under test.
  let seededUserId: bigint;

  beforeAll(async () => {
    app = await createTestApp(inject("databaseUrl"));
    prisma = app.prisma;
    const user = await prisma.user.findFirstOrThrow({ select: { id: true } });
    seededUserId = user.id;
  });

  afterAll(async () => {
    await prisma.chatbotChatConversation.deleteMany({});
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.chatbotChatConversation.deleteMany({});
  });

  it("gives an authenticated caller the full window", async () => {
    const created = await prisma.$transaction((tx) =>
      createConversation(tx, { kind: "user", userId: seededUserId })
    );

    expect(daysBetween(created.expiresAt, created.createdAt)).toBeCloseTo(
      CHATBOT_CONVERSATION_TTL_DAYS,
      1
    );
  });

  it("gives an anonymous caller the short window", async () => {
    const created = await prisma.$transaction((tx) =>
      createConversation(tx, { kind: "session", sessionId: "anon-session" })
    );

    expect(daysBetween(created.expiresAt, created.createdAt)).toBeCloseTo(
      CHATBOT_ANONYMOUS_CONVERSATION_TTL_DAYS,
      1
    );
  });

  it("keeps the two tiers distinct rather than collapsing to one value", async () => {
    const authenticated = await prisma.$transaction((tx) =>
      createConversation(tx, { kind: "user", userId: seededUserId })
    );
    const anonymous = await prisma.$transaction((tx) =>
      createConversation(tx, { kind: "session", sessionId: "anon-two" })
    );

    // Guards the branch itself: a regression that dropped the ternary would
    // still satisfy one of the two tests above, but not this one.
    expect(anonymous.expiresAt.getTime()).toBeLessThan(
      authenticated.expiresAt.getTime() - SLACK_MS
    );
  });

  it("still does not refresh the window when the conversation continues", async () => {
    const created = await prisma.$transaction((tx) =>
      createConversation(tx, { kind: "session", sessionId: "anon-three" })
    );

    await prisma.chatbotChatConversation.update({
      where: { id: created.id },
      data: { lastMessageAt: new Date() },
    });

    const reloaded = await prisma.chatbotChatConversation.findUniqueOrThrow({
      where: { id: created.id },
    });
    expect(reloaded.expiresAt.getTime()).toBe(created.expiresAt.getTime());
  });
});
