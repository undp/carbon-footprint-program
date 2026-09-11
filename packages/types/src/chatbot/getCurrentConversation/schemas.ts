import { z } from "zod";
import { ChatMessageRole } from "@repo/database/enums";
import { SourceCitationSchema } from "../sourceCitation/schemas.js";

/**
 * GET /api/chatbot/conversations/me/current response body. The endpoint
 * rehydrates the widget on mount from the signed `chatbot_conversation_id`
 * cookie when its TTL is still in the future AND the request identity
 * matches the conversation's identity.
 *
 * Internal columns (`tokens_used`, `latency_ms`, `truncated`) are intentionally
 * absent — they are operator-side observability fields and not part of the
 * widget contract.
 *
 * IDs are serialized as strings (BigInt-safe JSON wire shape), aligned with
 * the convention used by `sources` in the `done` SSE event payload.
 */
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
