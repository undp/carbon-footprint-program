import { z } from "zod";
import { IdSchema } from "../../zod.js";

export const SelfDeclareCarboInventoryParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const SelfDeclareCarbonInventoryResponseSchema = z
  .null()
  .describe("Self-declaration completed successfully");
