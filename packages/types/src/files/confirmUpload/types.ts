import { z } from "zod";
import type { ConfirmUploadBodySchema, ConfirmUploadResponseSchema } from "./schemas.ts";

export type ConfirmUploadBody = z.infer<typeof ConfirmUploadBodySchema>;
export type ConfirmUploadResponse = z.infer<typeof ConfirmUploadResponseSchema>;
