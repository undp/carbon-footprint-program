import { z } from "zod";
import { FilenameSchema } from "../../../baseSchemas/filename.js";

export const ConfirmLegalUploadBodySchema = z.object({
  uuid: z.uuid().describe("The file UUID returned by request-upload"),
  originalName: FilenameSchema.describe("The original file name"),
});

export const ConfirmLegalUploadResponseSchema = z.object({
  uuid: z.uuid().describe("The persisted file UUID"),
});
