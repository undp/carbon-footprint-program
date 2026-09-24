import { z } from "zod";
import { ChatMessageRole } from "@repo/database/enums";
import { ConversationIdSchema } from "../conversationId/schemas.js";
import { SourceCitationSchema } from "../sourceCitation/schemas.js";

/**
 * GET /api/chatbot/conversations/me/current response body. The endpoint
 * rehydrates the widget on mount from the `conversationId` the client sends,
 * when its TTL is still in the future AND the request identity matches the
 * conversation's identity.
 *
 * Internal columns (`tokens_used`, `latency_ms`, `truncated`) are intentionally
 * absent — they are operator-side observability fields and not part of the
 * widget contract.
 *
 * IDs are serialized as strings (BigInt-safe JSON wire shape), aligned with
 * the convention used by `sources` in the `done` SSE event payload.
 */
/**
 * Query for the rehydrate endpoint. The id is optional so a first-time visitor
 * — who has nothing stored yet — can call the endpoint without constructing a
 * special case; the handler answers 204 and the widget starts empty.
 */
export const GetCurrentConversationQuerySchema = z.object({
  conversationId: ConversationIdSchema.optional(),
});

export const GetCurrentConversationMessageSchema = z.object({
  id: z.string(),
  role: z.enum([ChatMessageRole.USER, ChatMessageRole.ASSISTANT]),
  content: z.string(),
  sourcesCited: z.array(SourceCitationSchema),
  createdAt: z.string().datetime(),
});

export const GetCurrentConversationResponseSchema = z.object({
  conversation: z.object({
    id: z.string(),
    createdAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
  }),
  messages: z.array(GetCurrentConversationMessageSchema),
});
