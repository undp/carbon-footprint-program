import { z } from "zod";
import type { UploadFileResponseSchema } from "./schemas.ts";

export type UploadFileResponse = z.infer<typeof UploadFileResponseSchema>;
