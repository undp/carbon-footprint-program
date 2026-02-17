import { z } from "zod";
import type { DeleteFileResponseSchema } from "./schemas.ts";

export type DeleteFileResponse = z.infer<typeof DeleteFileResponseSchema>;
