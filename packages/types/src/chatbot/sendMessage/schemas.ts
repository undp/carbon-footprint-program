import { z } from "zod";
import { ConversationIdSchema } from "../conversationId/schemas.js";
import { SourceCitationSchema } from "../sourceCitation/schemas.js";

// Mirrors `CHATBOT_MAX_USER_INPUT_TOKENS` (4000) * 4 chars/token = 16000 from
// apps/api/src/config/constants.ts. Kept as a literal here because
// packages/types is consumed by both the API and the web app and cannot import
// from apps/api.
export const CHATBOT_MAX_USER_INPUT_CHARS = 16000;

export const SendMessageRequestBodySchema = z
  .object({
    content: z.string().min(1).max(CHATBOT_MAX_USER_INPUT_CHARS),
    // The thread this turn continues. Omitted means "start a new one" — that
    // is the entire mechanism behind "Nueva conversación", and it is why the
    // field is optional rather than defaulted: absent and present are two
    // distinct intents the server must be able to tell apart.
    //
    // An id the caller is not entitled to is not an error: the lookup filters
    // by identity, misses, and the turn opens a fresh conversation. So this
    // field cannot be used to read or append to someone else's thread.
    conversationId: ConversationIdSchema.optional(),
  })
  .strict();

export const SendMessageDeltaEventSchema = z.object({
  type: z.literal("delta"),
  content: z.string(),
});

export const SendMessageDoneEventSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  sources: z.array(SourceCitationSchema).optional(),
});

export const SendMessageErrorEventSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export const SendMessageStreamEventSchema = z.union([
  SendMessageDeltaEventSchema,
  SendMessageDoneEventSchema,
  SendMessageErrorEventSchema,
]);
