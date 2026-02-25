import { z } from "zod";
import type {
  RequestUploadBodySchema,
  RequestUploadResponseSchema,
} from "./schemas.js";

export type RequestUploadBody = z.infer<typeof RequestUploadBodySchema>;
export type RequestUploadResponse = z.infer<typeof RequestUploadResponseSchema>;
