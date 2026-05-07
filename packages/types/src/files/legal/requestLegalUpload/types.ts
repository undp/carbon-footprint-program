import { z } from "zod";
import type {
  RequestLegalUploadBodySchema,
  RequestLegalUploadResponseSchema,
} from "./schemas.js";

export type RequestLegalUploadBody = z.infer<
  typeof RequestLegalUploadBodySchema
>;
export type RequestLegalUploadResponse = z.infer<
  typeof RequestLegalUploadResponseSchema
>;
