import type { Prisma, PrismaClient } from "@repo/database";
import { ChatMessageRole } from "@repo/database/enums";
import {
  CHATBOT_CONVERSATION_TTL_DAYS,
  CHATBOT_MAX_HISTORY_TOKENS,
  CHATBOT_MAX_TURNS_PER_CONVERSATION,
  CHATBOT_MAX_USER_INPUT_TOKENS,
} from "@/config/constants.js";
import { RequestTooLargeError } from "@/errors/RequestTooLargeError.js";
import { estimateTokens } from "@/features/chatbot/llmProvider/estimateTokens.js";
import type { ChatbotIdentity } from "@/features/chatbot/helpers/identity.js";

type Tx = Prisma.TransactionClient;

const advisoryLockKey = (identity: ChatbotIdentity): string =>
  identity.kind === "user"
    ? `chatbot:user:${identity.userId.toString()}`
    : `chatbot:session:${identity.sessionId}`;

/**
 * Acquire a transaction-scoped advisory lock keyed to the caller identity.
 * Closes the TOCTOU race for concurrent first-message turns: PostgreSQL's
 * default READ COMMITTED isolation lets two transactions both see "no active
 * conversation" and each insert one. The advisory lock serializes them so
 * the second waiter observes the row inserted by the first.
 *
 * Auto-releases on commit or rollback. Removing this lock without an
 * alternative (e.g., a unique partial index plus INSERT ... ON CONFLICT)
 * would re-introduce the race.
 */
export const acquireIdentityAdvisoryLock = async (
  tx: Tx,
  identity: ChatbotIdentity
): Promise<void> => {
  const key = advisoryLockKey(identity);
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
};

const conversationIdentityFilter = (identity: ChatbotIdentity) =>
  identity.kind === "user"
    ? { userId: identity.userId, sessionId: null }
    : { userId: null, sessionId: identity.sessionId };

export const findActiveConversation = async (
  tx: Tx,
  identity: ChatbotIdentity
) => {
  return tx.chatbotChatConversation.findFirst({
    where: {
      ...conversationIdentityFilter(identity),
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
};

const computeExpiresAt = (now: Date): Date =>
  new Date(now.getTime() + CHATBOT_CONVERSATION_TTL_DAYS * 24 * 60 * 60 * 1000);

export const createConversation = async (tx: Tx, identity: ChatbotIdentity) => {
  const now = new Date();
  // organization_id and ip_hash are intentionally omitted — they ship dormant
  // in foundation per the chatbot-conversation-persistence spec, and the
  // noWritesToDormantColumns lint test enforces that.
  return tx.chatbotChatConversation.create({
    data: {
      userId: identity.kind === "user" ? identity.userId : null,
      sessionId: identity.kind === "session" ? identity.sessionId : null,
      expiresAt: computeExpiresAt(now),
      createdAt: now,
      lastMessageAt: now,
    },
  });
};

export const resolveOrCreateConversation = async (
  tx: Tx,
  identity: ChatbotIdentity
) => {
  const existing = await findActiveConversation(tx, identity);
  if (existing) return existing;
  return createConversation(tx, identity);
};

export const loadConversationHistory = async (
  prisma: Tx | PrismaClient,
  conversationId: bigint,
  limit = 50
) => {
  return prisma.chatbotChatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
};

export const enforceUserInputCap = (userContent: string): void => {
  if (estimateTokens(userContent) > CHATBOT_MAX_USER_INPUT_TOKENS) {
    throw new RequestTooLargeError(
      "El mensaje del usuario excede el límite de tokens permitido."
    );
  }
};

export const enforceHistoryCap = (history: { content: string }[]): void => {
  const total = history.reduce((sum, m) => sum + estimateTokens(m.content), 0);
  if (total > CHATBOT_MAX_HISTORY_TOKENS) {
    throw new RequestTooLargeError(
      "El historial de la conversación excede el límite de tokens permitido."
    );
  }
};

export const enforceTurnCap = async (
  prisma: Tx | PrismaClient,
  conversationId: bigint
): Promise<void> => {
  const userTurns = await prisma.chatbotChatMessage.count({
    where: { conversationId, role: ChatMessageRole.USER },
  });
  if (userTurns >= CHATBOT_MAX_TURNS_PER_CONVERSATION) {
    throw new RequestTooLargeError(
      "La conversación alcanzó el límite de turnos permitido."
    );
  }
};
