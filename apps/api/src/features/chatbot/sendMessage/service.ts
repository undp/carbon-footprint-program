import type { Prisma, PrismaClient } from "@repo/database";
import { ChatMessageRole } from "@repo/database/enums";
import {
  CHATBOT_ANONYMOUS_CONVERSATION_TTL_DAYS,
  CHATBOT_CONVERSATION_TTL_DAYS,
  CHATBOT_MAX_HISTORY_MESSAGES,
  CHATBOT_MAX_HISTORY_TOKENS,
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

export const conversationIdentityFilter = (identity: ChatbotIdentity) =>
  identity.kind === "user"
    ? { userId: identity.userId, sessionId: null }
    : { userId: null, sessionId: identity.sessionId };

export const findConversationForIdentity = async (
  tx: Tx,
  conversationId: bigint,
  identity: ChatbotIdentity
) => {
  return tx.chatbotChatConversation.findFirst({
    where: {
      id: conversationId,
      ...conversationIdentityFilter(identity),
      expiresAt: { gt: new Date() },
    },
  });
};

/**
 * Retention window for a new conversation, chosen by identity kind.
 *
 * Anonymous callers keep less: they gain only a thread that survives a reload,
 * which the browser can revoke on its own by dropping the session cookie, while
 * carrying the same data-at-rest exposure as an account holder. See the
 * constants for the full reasoning.
 */
const computeExpiresAt = (now: Date, identity: ChatbotIdentity): Date => {
  const days =
    identity.kind === "user"
      ? CHATBOT_CONVERSATION_TTL_DAYS
      : CHATBOT_ANONYMOUS_CONVERSATION_TTL_DAYS;
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
};

export const createConversation = async (tx: Tx, identity: ChatbotIdentity) => {
  const now = new Date();
  // organization_id and ip_hash are intentionally omitted — they ship dormant
  // in foundation per the chatbot-conversation-persistence spec, and the
  // noWritesToDormantColumns lint test enforces that.
  return tx.chatbotChatConversation.create({
    data: {
      userId: identity.kind === "user" ? identity.userId : null,
      sessionId: identity.kind === "session" ? identity.sessionId : null,
      expiresAt: computeExpiresAt(now, identity),
      createdAt: now,
      lastMessageAt: now,
    },
  });
};

/**
 * Resolve the conversation this turn belongs to, creating one when there is
 * none to attach to.
 *
 * Driven entirely by the id the client sends. There is deliberately no
 * fallback to "the newest active row for this identity": that would undo
 * "Nueva conversación", whose whole mechanism is omitting the id. The next
 * turn would reattach to the thread the user just left, feed its history back
 * into the prompt, and hand back the same id.
 *
 * An id that no longer resolves — expired row, or an identity that has since
 * changed (anon -> authenticated) — starts a fresh conversation rather than
 * failing the turn, and the response header names the new one. The rehydrate
 * endpoint is where a stale id is reported as a 404; the send path just moves
 * on.
 */
export const resolveOrCreateConversation = async (
  tx: Tx,
  identity: ChatbotIdentity,
  requestedConversationId: bigint | null
) => {
  if (requestedConversationId !== null) {
    const existing = await findConversationForIdentity(
      tx,
      requestedConversationId,
      identity
    );
    if (existing) return existing;
  }
  return createConversation(tx, identity);
};

/**
 * The prior turns fed into this turn's prompt, oldest-first.
 *
 * Takes the NEWEST `limit` rows and reverses them. Taking the oldest instead —
 * `orderBy: asc` with a `take` — is the same query to read and quietly wrong:
 * past `limit` messages the model stops seeing anything recent and answers from
 * the opening of the thread, with no error anywhere to say so.
 *
 * The secondary sort on `id` is load-bearing, not tidiness. `created_at` is
 * TIMESTAMP(3) and both rows of a turn are written inside one transaction, so
 * the column does not reliably separate a user message from its own reply.
 * Sorting on it alone leaves their order to the planner, and a prompt that puts
 * the answer before the question is worse than one missing the pair. `id` is a
 * BIGSERIAL, so it always breaks the tie in insertion order.
 */
export const loadConversationHistory = async (
  prisma: Tx | PrismaClient,
  conversationId: bigint,
  limit = CHATBOT_MAX_HISTORY_MESSAGES
) => {
  const newestFirst = await prisma.chatbotChatMessage.findMany({
    // Exclude unfinalized assistant rows: an assistant row is created empty
    // inside the turn transaction and only gets `latencyMs` set once its
    // stream finalizes successfully. A row left with `latencyMs = null` is
    // either in-flight or belongs to a failed/disconnected turn, and feeding
    // its empty/partial content back as `{ role: assistant }` would corrupt
    // the next prompt. User rows also carry `latencyMs = null`, so the filter
    // is scoped to the ASSISTANT role.
    where: {
      conversationId,
      NOT: { role: ChatMessageRole.ASSISTANT, latencyMs: null },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
  });
  return newestFirst.reverse();
};

/**
 * Server-side token cap on user input.
 *
 * Deliberately unreachable in foundation: the Zod body schema rejects any
 * content over CHATBOT_MAX_USER_INPUT_CHARS (= CHATBOT_MAX_USER_INPUT_TOKENS
 * * 4 = 16000) with a 400 before the handler runs, so the 413 branch never
 * fires today. It is kept as defense-in-depth and as the single source of
 * truth for the *token* limit (the char cap is only a proxy): V1 plans to
 * widen the Zod char cap to admit multi-byte scripts where 4 chars/token
 * under-counts, at which point this token check becomes the effective guard.
 * Removing it now would silently drop that protection when the cap moves.
 */
/*
 * The 413 below reaches the end user verbatim: the widget shows the server's
 * `message` rather than a fixed string, so this is UI copy, not an operator
 * log. It avoids the word "turnos" — that is LLM vocabulary; a person counts
 * messages — and it names the one action that clears it.
 *
 * It is also the ONLY 413 the chatbot can answer with. Two earlier ones said
 * the conversation had accumulated too much text, or had reached its maximum
 * number of messages, and both were dead ends: the thread could never carry
 * another turn. They are gone, replaced by trimHistoryToBudget below, which
 * drops old turns instead of refusing new ones. A conversation no longer fills
 * up, so there is nothing left to tell the user about it.
 */
export const enforceUserInputCap = (userContent: string): void => {
  if (estimateTokens(userContent) > CHATBOT_MAX_USER_INPUT_TOKENS) {
    throw new RequestTooLargeError(
      "Tu mensaje es demasiado largo. Escríbelo más corto e inténtalo de nuevo."
    );
  }
};

/**
 * Fit the prompt inside CHATBOT_MAX_HISTORY_TOKENS by dropping the oldest
 * turns, and return what survives.
 *
 * Replaces a pair of hard caps. The old behaviour refused the turn — 413 on a
 * history that had grown past the budget, and a second 413 once the
 * conversation reached a fixed number of user messages. Both left the thread
 * permanently unusable: every subsequent message hit the same wall, and the
 * only escape was to abandon the conversation. That is not how a chat is
 * expected to behave, and the turn cap additionally cost a COUNT query per
 * turn inside the identity advisory lock.
 *
 * The system prompt and the incoming user message are charged against the
 * budget but never dropped — they are not history, and the turn is
 * meaningless without them. `enforceUserInputCap` has already bounded the user
 * message, so the two together are a known quantity.
 *
 * Trimming from the oldest end leaves a contiguous, chronological suffix: the
 * model may lose the start of a long conversation, which is the intended
 * trade, but it never sees a gap in the middle.
 */
export const trimHistoryToBudget = <T extends { content: string }>(
  history: T[],
  systemPrompt: string,
  userContent: string
): T[] => {
  const fixedCost = estimateTokens(systemPrompt) + estimateTokens(userContent);
  if (fixedCost > CHATBOT_MAX_HISTORY_TOKENS) {
    // Not reachable with the shipped constants: the system prompt is ~1088
    // tokens and the user message is capped at CHATBOT_MAX_USER_INPUT_TOKENS.
    // If it ever is, the deployment is misconfigured rather than the request
    // oversized, and failing loudly beats sending a prompt we know is too big.
    throw new Error(
      `Chatbot token budget is misconfigured: the system prompt plus a maximum-size user message (${fixedCost} tokens) exceed CHATBOT_MAX_HISTORY_TOKENS (${CHATBOT_MAX_HISTORY_TOKENS}). Raise the budget or shorten the system prompt.`
    );
  }

  let budget = CHATBOT_MAX_HISTORY_TOKENS - fixedCost;
  // Walk from the newest backwards, keeping what fits, so the messages closest
  // to the question are the ones that survive.
  const kept: T[] = [];
  for (let i = history.length - 1; i >= 0; i--) {
    const cost = estimateTokens(history[i].content);
    if (cost > budget) break;
    budget -= cost;
    kept.push(history[i]);
  }
  return kept.reverse();
};
