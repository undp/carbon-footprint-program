import { z } from "zod";
import type { SasUrlResponseSchema } from "./schemas.js";

export type SasUrlResponse = z.infer<typeof SasUrlResponseSchema>;
