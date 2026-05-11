import { z } from "zod";

// Mirrors `CHATBOT_MAX_USER_INPUT_TOKENS` (4000) * 4 chars/token = 16000 from
// apps/api/src/config/constants.ts. Kept as a literal here because
// packages/types is consumed by both the API and the web app and cannot import
// from apps/api.
export const CHATBOT_MAX_USER_INPUT_CHARS = 16000;

export const SendMessageRequestBodySchema = z
  .object({
    content: z.string().min(1).max(CHATBOT_MAX_USER_INPUT_CHARS),
  })
  .strict();

export const SendMessageDeltaEventSchema = z.object({
  type: z.literal("delta"),
  content: z.string(),
});

export const SendMessageDoneEventSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
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
