import { z } from "zod";
import type {
  DeleteMyConversationRequestSchema,
  DeleteMyConversationResponseSchema,
} from "./schemas.ts";

export type DeleteMyConversationRequest = z.infer<
  typeof DeleteMyConversationRequestSchema
>;

export type DeleteMyConversationResponse = z.infer<
  typeof DeleteMyConversationResponseSchema
>;
