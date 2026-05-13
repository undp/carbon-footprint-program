import { z } from "zod";
import { IdSchema } from "../../zod.js";
import {
  LineFileOriginalNameSchema,
  LineFileSummarySchema,
} from "../schemas.js";

export const ConfirmLineFileUploadParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const ConfirmLineFileUploadBodySchema = z.object({
  uuid: z.uuid().describe("The file UUID returned by request-upload"),
  originalName: LineFileOriginalNameSchema,
});

export const ConfirmLineFileUploadResponseSchema = LineFileSummarySchema;
