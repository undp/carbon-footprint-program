import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { LineFileOriginalNameSchema } from "../schemas.js";

export const RequestLineFileUploadParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const RequestLineFileUploadBodySchema = z.object({
  originalName: LineFileOriginalNameSchema,
});

export const RequestLineFileUploadResponseSchema = z.object({
  uuid: z.uuid().describe("The generated file UUID"),
  uploadUrl: z
    .httpUrl()
    .describe("Temporary signed URL for uploading the file"),
  expiresAt: z.iso.datetime().describe("When the upload URL expires"),
});
