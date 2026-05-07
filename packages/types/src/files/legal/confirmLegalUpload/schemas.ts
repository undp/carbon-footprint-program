import { z } from "zod";
import { LegalOriginalNameSchema } from "../baseSchemas.js";

export const ConfirmLegalUploadBodySchema = z.object({
  uuid: z.uuid().describe("The file UUID returned by request-upload"),
  originalName: LegalOriginalNameSchema.describe("The original file name"),
});

export const ConfirmLegalUploadResponseSchema = z.object({
  uuid: z.uuid().describe("The persisted file UUID"),
});
