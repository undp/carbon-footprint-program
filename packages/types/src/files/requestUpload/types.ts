import { z } from "zod";
import {
  RequestUploadBodySchema,
  RequestUploadResponseSchema,
} from "./schemas.js";

export type RequestUploadBody = z.infer<typeof RequestUploadBodySchema>;
export type RequestUploadResponse = z.infer<typeof RequestUploadResponseSchema>;
