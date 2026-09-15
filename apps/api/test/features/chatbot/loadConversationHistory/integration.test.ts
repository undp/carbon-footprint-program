import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  inject,
} from "vitest";
import { PrismaClient, generatePrismaAdapter } from "@repo/database";
import { ChatMessageRole } from "@repo/database/enums";
import { CHATBOT_MAX_HISTORY_MESSAGES } from "@/config/constants.js";
import { loadConversationHistory } from "@/features/chatbot/sendMessage/service.js";

const FUTURE = (): Date => new Date(Date.now() + 24 * 60 * 60 * 1000);

describe("loadConversationHistory — integration", () => {
  let prisma: PrismaClient;
  let conversationId: bigint;

  beforeAll(() => {
    prisma = new PrismaClient({
      adapter: generatePrismaAdapter(inject("databaseUrl")),
    });
  });

  afterAll(async () => {
    await prisma.chatbotChatConversation.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.chatbotChatConversation.deleteMany({});
    const conversation = await prisma.chatbotChatConversation.create({
      data: { sessionId: "history-session", expiresAt: FUTURE() },
    });
    conversationId = conversation.id;
  });

  /**
   * Seed `count` finalized messages, numbered in content so the assertions can
   * name exactly which ones came back. `createdAt` is spaced explicitly rather
   * than left to the default: the rows are inserted far faster than TIMESTAMP(3)
   * can separate them, and a test that cannot tell old from new would pass
   * against the very bug it exists to catch.
   */
  const seedMessages = async (count: number): Promise<void> => {
    const base = Date.now() - count * 1000;
    for (let i = 0; i < count; i++) {
      await prisma.chatbotChatMessage.create({
        data: {
          conversationId,
          role: i % 2 === 0 ? ChatMessageRole.USER : ChatMessageRole.ASSISTANT,
          content: `mensaje ${i}`,
          latencyMs: 10,
          createdAt: new Date(base + i * 1000),
        },
      });
    }
  };

  it("returns the NEWEST messages when the thread exceeds the limit", async () => {
    const total = CHATBOT_MAX_HISTORY_MESSAGES + 10;
    await seedMessages(total);

    const history = await loadConversationHistory(prisma, conversationId);

    expect(history).toHaveLength(CHATBOT_MAX_HISTORY_MESSAGES);
    // The regression this guards: `orderBy: asc` with a `take` returns the
    // OLDEST window, so past the limit the model answers from the opening of
    // the thread and never sees the message it is replying to.
    expect(history[history.length - 1].content).toBe(`mensaje ${total - 1}`);
    expect(history[0].content).toBe(
      `mensaje ${total - CHATBOT_MAX_HISTORY_MESSAGES}`
    );
  });

  it("returns them oldest-first, the order the prompt is built in", async () => {
    await seedMessages(6);

    // Explicit limit: this case is about ORDER, not about the window, and
    // tying it to CHATBOT_MAX_HISTORY_MESSAGES would make it fail whenever that
    // constant is tuned below the seed count — which is exactly what happens on
    // a branch that lowers the caps to exercise the error paths.
    const history = await loadConversationHistory(prisma, conversationId, 10);

    expect(history.map((m) => m.content)).toEqual([
      "mensaje 0",
      "mensaje 1",
      "mensaje 2",
      "mensaje 3",
      "mensaje 4",
      "mensaje 5",
    ]);
  });

  it("keeps a user message ahead of its own reply when both share a timestamp", async () => {
    // Both rows of a turn are written in one transaction, so CURRENT_TIMESTAMP
    // can hand them the same created_at. Ordering on that column alone leaves
    // the pair to the planner; `id` is what makes the question precede the
    // answer.
    const sameInstant = new Date();
    const user = await prisma.chatbotChatMessage.create({
      data: {
        conversationId,
        role: ChatMessageRole.USER,
        content: "pregunta",
        createdAt: sameInstant,
      },
    });
    const assistant = await prisma.chatbotChatMessage.create({
      data: {
        conversationId,
        role: ChatMessageRole.ASSISTANT,
        content: "respuesta",
        latencyMs: 10,
        createdAt: sameInstant,
      },
    });
    expect(assistant.id).toBeGreaterThan(user.id);

    const history = await loadConversationHistory(prisma, conversationId);

    expect(history.map((m) => m.content)).toEqual(["pregunta", "respuesta"]);
  });

  it("still excludes unfinalized assistant rows after the reversal", async () => {
    // The newest row is an in-flight assistant turn. Taking the newest window
    // must not smuggle it in — its content is empty and feeding it back as an
    // assistant message would corrupt the next prompt.
    await seedMessages(4);
    await prisma.chatbotChatMessage.create({
      data: {
        conversationId,
        role: ChatMessageRole.ASSISTANT,
        content: "",
        latencyMs: null,
        createdAt: new Date(),
      },
    });

    const history = await loadConversationHistory(prisma, conversationId);

    expect(history).toHaveLength(4);
    expect(history[history.length - 1].content).toBe("mensaje 3");
  });
});
