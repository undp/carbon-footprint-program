import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { SignedUrlResponseSchema } from "../../files/schemas.js";

export const PreviewLineFileParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
  uuid: z.uuid().describe("The file UUID"),
});

export const PreviewLineFileResponseSchema = SignedUrlResponseSchema;
