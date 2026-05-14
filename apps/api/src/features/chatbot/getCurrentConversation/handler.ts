import type { FastifyReply, FastifyRequest } from "fastify";
import { ChatMessageRole } from "@repo/database/enums";
import type {
  GetCurrentConversationMessage,
  GetCurrentConversationResponse,
  SourceCitation,
} from "@repo/types";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";
import {
  clearConversationCookie,
  readSignedConversationCookie,
} from "@/features/chatbot/helpers/conversationCookie.js";
import { findCurrentConversation } from "./service.js";

const NOT_FOUND_BODY: ApiErrorResponse = {
  code: "CONVERSATION_NOT_FOUND",
  message: "No active conversation matches the provided cookie.",
};

type ExposedRole =
  | typeof ChatMessageRole.USER
  | typeof ChatMessageRole.ASSISTANT;
const EXPOSED_ROLES = new Set<ChatMessageRole>([
  ChatMessageRole.USER,
  ChatMessageRole.ASSISTANT,
]);

const parseConversationIdOrNull = (raw: string): bigint | null => {
  // Conversation IDs are positive bigints; reject anything that does not
  // round-trip cleanly so a tampered cookie cannot trigger a Prisma error
  // before the 404 fall-through.
  if (!/^\d+$/.test(raw)) return null;
  try {
    const value = BigInt(raw);
    return value > 0n ? value : null;
  } catch {
    return null;
  }
};

export const getCurrentConversationHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<GetCurrentConversationResponse | ApiErrorResponse | null> => {
  const cookieValue = readSignedConversationCookie(request);
  if (!cookieValue) {
    // No (valid) cookie — nothing to rehydrate. 204 is the "start empty"
    // signal the widget reads on mount.
    reply.code(204);
    return null;
  }

  const conversationId = parseConversationIdOrNull(cookieValue);
  const identity = request.chatbotIdentity;
  if (!conversationId || !identity) {
    // Cookie present but unusable (tampered id, or caller has no resolvable
    // identity). Clear the cookie so the next request starts clean instead
    // of looping into the same 404.
    clearConversationCookie(reply);
    reply.code(404);
    return NOT_FOUND_BODY;
  }

  const row = await findCurrentConversation(
    request.server.prisma,
    conversationId,
    identity
  );
  if (!row) {
    // Either expired, not found, or identity mismatch (e.g., anon → auth
    // transition, which V1 deliberately does not support — see Decision 28).
    // Clear the stale cookie so the widget does not re-attempt this lookup
    // on every reload.
    clearConversationCookie(reply);
    reply.code(404);
    return NOT_FOUND_BODY;
  }

  // The service-level query filters to USER / ASSISTANT roles; defensively
  // re-check at the handler boundary so a future relaxation of that filter
  // cannot accidentally leak SYSTEM / TOOL rows onto the wire.
  const messages: GetCurrentConversationMessage[] = row.messages
    .filter((m): m is typeof m & { role: ExposedRole } =>
      EXPOSED_ROLES.has(m.role)
    )
    .map((m) => ({
      id: m.id.toString(),
      role: m.role,
      content: m.content,
      sourcesCited: (m.sourcesCited as SourceCitation[] | null) ?? [],
      createdAt: m.createdAt.toISOString(),
    }));

  return {
    conversation: {
      id: row.id.toString(),
      createdAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
    },
    messages,
  };
};
