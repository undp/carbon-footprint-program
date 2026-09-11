import { z } from "zod";
import type {
  GetCurrentConversationMessageSchema,
  GetCurrentConversationResponseSchema,
} from "./schemas.ts";

export type GetCurrentConversationMessage = z.infer<
  typeof GetCurrentConversationMessageSchema
>;

export type GetCurrentConversationResponse = z.infer<
  typeof GetCurrentConversationResponseSchema
>;
