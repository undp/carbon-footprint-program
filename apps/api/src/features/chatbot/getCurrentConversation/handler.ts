import type { FastifyReply, FastifyRequest } from "fastify";
import { ChatMessageRole } from "@repo/database/enums";
import type {
  GetCurrentConversationMessage,
  GetCurrentConversationQuery,
  GetCurrentConversationResponse,
  SourceCitation,
} from "@repo/types";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";
import { findCurrentConversation } from "./service.js";

const NOT_FOUND_BODY: ApiErrorResponse = {
  code: "CONVERSATION_NOT_FOUND",
  message: "No active conversation matches the provided id.",
};

type ExposedRole =
  typeof ChatMessageRole.USER | typeof ChatMessageRole.ASSISTANT;
const EXPOSED_ROLES = new Set<ChatMessageRole>([
  ChatMessageRole.USER,
  ChatMessageRole.ASSISTANT,
]);

type GetCurrentConversationRequest = FastifyRequest<{
  Querystring: GetCurrentConversationQuery;
}>;

export const getCurrentConversationHandler = async (
  request: GetCurrentConversationRequest,
  reply: FastifyReply
): Promise<GetCurrentConversationResponse | ApiErrorResponse | null> => {
  const { conversationId: requestedId } = request.query;
  if (requestedId === undefined) {
    // The caller holds no conversation — a first visit, or one that just used
    // "Nueva conversación". 204 is the "start empty" signal the widget reads
    // on mount.
    reply.code(204);
    return null;
  }

  const identity = request.chatbotIdentity;
  if (!identity) {
    // An id was named but the caller has no resolvable identity, so the row
    // cannot be matched to them. Same answer as a miss.
    reply.code(404);
    return NOT_FOUND_BODY;
  }

  // The Zod query schema has already checked the shape, so BigInt() cannot
  // throw here.
  const row = await findCurrentConversation(
    request.server.prisma,
    BigInt(requestedId),
    identity
  );
  if (!row) {
    // Either expired, not found, or identity mismatch (e.g., anon → auth
    // transition, which V1 deliberately does not support — see Decision 28).
    // The widget drops its stored id on this status, so the next reload asks
    // for nothing rather than looping into the same 404.
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
