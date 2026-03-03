import { z } from "zod";
import type { GetMeResponseSchema } from "./schemas.ts";

export type GetMeResponse = z.infer<typeof GetMeResponseSchema>;
