import { z } from "zod";

// TODO: Agregar mensaje de error por la validación del mensaje
export const ChatMessageRequestSchema = z.object({
  message: z.string().min(1).max(4000),
});

export const ChatMessageResponseSchema = z.object({
  response: z.string(),
});
