import { z } from "zod";
import type { SasUrlResponseSchema } from "./schemas.ts";

export type SasUrlResponse = z.infer<typeof SasUrlResponseSchema>;
