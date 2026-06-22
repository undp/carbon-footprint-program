import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { LineFileOriginalNameSchema } from "../schemas.js";
import { PresignedUploadResponseSchema } from "../../files/schemas.js";

export const RequestLineFileUploadParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const RequestLineFileUploadBodySchema = z.object({
  originalName: LineFileOriginalNameSchema,
});

export const RequestLineFileUploadResponseSchema =
  PresignedUploadResponseSchema;
