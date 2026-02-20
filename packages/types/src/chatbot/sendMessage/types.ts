import { z } from "zod";
import type {
  ChatMessageRequestSchema,
  ChatMessageResponseSchema,
} from "./schemas.js";

// TypeScript Types
export type ChatMessageRequest = z.infer<typeof ChatMessageRequestSchema>;
export type ChatMessageResponse = z.infer<typeof ChatMessageResponseSchema>;
