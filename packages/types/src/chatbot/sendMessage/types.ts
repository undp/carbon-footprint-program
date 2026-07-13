import { z } from "zod";
import type {
  SendMessageRequestBodySchema,
  SendMessageDeltaEventSchema,
  SendMessageDoneEventSchema,
  SendMessageErrorEventSchema,
} from "./schemas.ts";

export type SendMessageRequestBody = z.infer<
  typeof SendMessageRequestBodySchema
>;

export type SendMessageDeltaEvent = z.infer<typeof SendMessageDeltaEventSchema>;
export type SendMessageDoneEvent = z.infer<typeof SendMessageDoneEventSchema>;
export type SendMessageErrorEvent = z.infer<typeof SendMessageErrorEventSchema>;
