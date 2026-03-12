import { IdSchema } from "../../zod.js";
import { z } from "zod";

export const DeleteCarbonInventoryParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const DeleteCarbonInventoryResponseSchema = z
  .null()
  .describe("Successfully deleted");
