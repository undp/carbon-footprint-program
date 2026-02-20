import { z } from "zod";

export const ChatMessageRequestSchema = z.object({
  message: z.string().min(1).max(4000),
});

export const ChatMessageResponseSchema = z.object({
  response: z.string(),
});
