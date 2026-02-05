import { z } from "zod";
import type { GetMeBodySchema, GetMeResponseSchema } from "./schemas.ts";

export type GetMeBody = z.infer<typeof GetMeBodySchema>;

export type GetMeResponse = z.infer<typeof GetMeResponseSchema>;
