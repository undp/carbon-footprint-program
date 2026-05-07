import { z } from "zod";
import {
  ConfirmLegalUploadBodySchema,
  ConfirmLegalUploadResponseSchema,
} from "./schemas.js";

export type ConfirmLegalUploadBody = z.infer<
  typeof ConfirmLegalUploadBodySchema
>;
export type ConfirmLegalUploadResponse = z.infer<
  typeof ConfirmLegalUploadResponseSchema
>;
