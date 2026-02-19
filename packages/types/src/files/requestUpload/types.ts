import { z } from "zod";
import type { RequestUploadBodySchema, RequestUploadResponseSchema } from "./schemas.ts";

export type RequestUploadBody = z.infer<typeof RequestUploadBodySchema>;
export type RequestUploadResponse = z.infer<typeof RequestUploadResponseSchema>;
