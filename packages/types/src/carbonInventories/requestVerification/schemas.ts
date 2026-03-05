import { z } from "zod";
import { IdSchema } from "../../zod.js";

export const RequestVerificationParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const RequestVerificationResponseSchema = z
  .null()
  .describe("Verification request created successfully");
