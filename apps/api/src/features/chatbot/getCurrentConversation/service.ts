import type { Prisma, PrismaClient } from "@repo/database";
import { ChatMessageRole } from "@repo/database/enums";
import type { ChatbotIdentity } from "@/features/chatbot/helpers/identity.js";
import { conversationIdentityFilter } from "@/features/chatbot/sendMessage/service.js";

type Tx = Prisma.TransactionClient;

export type CurrentConversationRow = {
  id: bigint;
  createdAt: Date;
  expiresAt: Date;
  messages: {
    id: bigint;
    role: ChatMessageRole;
    content: string;
    sourcesCited: Prisma.JsonValue;
    createdAt: Date;
  }[];
};

/**
 * Fetch the conversation named by the caller's `conversationId` query
 * parameter iff (a) the row is still within its TTL window, AND (b) the row's
 * identity matches the requester strictly:
 *
 *   - authenticated requester → `user_id = caller.userId AND session_id IS NULL`
 *   - anonymous requester → `session_id = caller.sessionId AND user_id IS NULL`
 *
 * The match is intentionally strict to close the IDOR window. The endpoint
 * does NOT support the anon → auth claim transition in V1 (Decision 28); a
 * user who started anonymously and then logs in receives 404 here, and the
 * client falls back to a new conversation.
 *
 * Messages are filtered to `USER` / `ASSISTANT` roles so internal `SYSTEM` /
 * `TOOL` rows — should they ever be persisted by a future change — do not
 * leak onto the wire.
 */
export const findCurrentConversation = async (
  prisma: Tx | PrismaClient,
  conversationId: bigint,
  identity: ChatbotIdentity
): Promise<CurrentConversationRow | null> => {
  return prisma.chatbotChatConversation.findFirst({
    where: {
      id: conversationId,
      expiresAt: { gt: new Date() },
      ...conversationIdentityFilter(identity),
    },
    select: {
      id: true,
      createdAt: true,
      expiresAt: true,
      messages: {
        // Same exclusion loadConversationHistory applies, for the same reason:
        // an assistant row is created empty inside the turn transaction and
        // only gets `latencyMs` once its stream finalizes successfully. A row
        // still at NULL is in flight, or belongs to a turn that failed or was
        // stopped. Returning it renders an empty bubble — or a partial answer
        // styled as a complete one — the next time the widget mounts. User rows
        // also carry `latencyMs = null`, so the exclusion is scoped to the
        // ASSISTANT role.
        where: {
          role: { in: [ChatMessageRole.USER, ChatMessageRole.ASSISTANT] },
          NOT: { role: ChatMessageRole.ASSISTANT, latencyMs: null },
        },
        // `id` breaks the tie for the same reason as in loadConversationHistory:
        // both rows of a turn are written in one transaction, and TIMESTAMP(3)
        // does not reliably separate them — a rehydrated thread must not render
        // the answer above the question it replies to.
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          role: true,
          content: true,
          sourcesCited: true,
          createdAt: true,
        },
      },
    },
  });
};
