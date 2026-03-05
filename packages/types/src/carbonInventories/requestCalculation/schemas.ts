import { z } from "zod";
import { IdSchema } from "../../zod.js";

export const RequestCalculationParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const RequestCalculationResponseSchema = z
  .null()
  .describe("Calculation request created successfully");
