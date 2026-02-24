import { z } from "zod";
import type { DeleteFileResponseSchema } from "./schemas.js";

export type DeleteFileResponse = z.infer<typeof DeleteFileResponseSchema>;
