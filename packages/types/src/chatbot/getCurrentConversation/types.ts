import { z } from "zod";
import type {
  GetCurrentConversationMessageSchema,
  GetCurrentConversationQuerySchema,
  GetCurrentConversationResponseSchema,
} from "./schemas.ts";

export type GetCurrentConversationMessage = z.infer<
  typeof GetCurrentConversationMessageSchema
>;

export type GetCurrentConversationResponse = z.infer<
  typeof GetCurrentConversationResponseSchema
>;

export type GetCurrentConversationQuery = z.infer<
  typeof GetCurrentConversationQuerySchema
>;
