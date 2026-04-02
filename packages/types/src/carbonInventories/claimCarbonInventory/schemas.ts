import { IdSchema } from "../../zod.js";
import { z } from "zod";

export const ClaimCarbonInventoryParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const ClaimCarbonInventoryResponseSchema = z
  .null()
  .describe("Carbon inventory claimed successfully");
