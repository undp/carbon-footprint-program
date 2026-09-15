import { z } from "zod";
import type { ConversationIdSchema } from "./schemas.ts";

export type ConversationId = z.infer<typeof ConversationIdSchema>;
