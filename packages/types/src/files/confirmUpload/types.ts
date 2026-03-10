import { z } from "zod";
import {
  ConfirmUploadBodySchema,
  ConfirmUploadResponseSchema,
} from "./schemas.js";

export type ConfirmUploadBody = z.infer<typeof ConfirmUploadBodySchema>;
export type ConfirmUploadResponse = z.infer<typeof ConfirmUploadResponseSchema>;
