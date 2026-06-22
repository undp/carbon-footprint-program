import { z } from "zod";
import { LegalOriginalNameSchema } from "../baseSchemas.js";
import { PresignedUploadResponseSchema } from "../../schemas.js";

export const RequestLegalUploadBodySchema = z.object({
  originalName: LegalOriginalNameSchema.describe("The original file name"),
});

export const RequestLegalUploadResponseSchema = PresignedUploadResponseSchema;
