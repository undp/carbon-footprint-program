import { z } from "zod";

/**
 * The client's pointer to the thread a turn belongs to.
 *
 * Serialized as a decimal string because the underlying column is a BigInt and
 * JSON has no BigInt — the same wire shape `GetCurrentConversationResponse`
 * uses for `conversation.id` and message ids.
 *
 * Shared by the POST /message body and the GET /conversations/me/current query
 * so both ends validate the id identically. A value that does not match is
 * rejected at the schema boundary and never reaches Prisma; a syntactically
 * valid id that belongs to someone else is caught separately, by the
 * identity filter on the lookup.
 */
export const ConversationIdSchema = z.string().regex(/^[1-9]\d*$/);

/**
 * Response header carrying the id of the conversation a turn was attached to.
 *
 * Every POST /message response sets it — the SSE stream, and the pre-stream
 * error responses alike. That second case is the reason it is a header and not
 * an SSE event: the conversation row (and the user's message inside it) is
 * committed before the model is ever called, so a turn that fails at 413 or
 * 503 has still created a thread. A client that only learned the id from a
 * successful stream would orphan that thread and open another one on its next
 * attempt.
 *
 * Must be listed in the CORS `exposedHeaders` (see plugins/external/cors.ts) —
 * it is not CORS-safelisted, so a cross-origin caller reads null without it.
 */
export const CHATBOT_CONVERSATION_ID_HEADER = "x-conversation-id";
