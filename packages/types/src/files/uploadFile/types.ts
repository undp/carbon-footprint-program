import { z } from "zod";
import type {
  UploadFileQuerySchema,
  UploadFileResponseSchema,
} from "./schemas.js";

export type UploadFileQuery = z.infer<typeof UploadFileQuerySchema>;
export type UploadFileResponse = z.infer<typeof UploadFileResponseSchema>;
