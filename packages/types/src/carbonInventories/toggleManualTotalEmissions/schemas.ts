import { z } from "zod";
import { IdSchema } from "../../zod.js";

// Request schema
export const ToggleManualTotalEmissionsRequestSchema = z
  .object({
    activated: z
      .boolean()
      .describe("Whether to activate manual total emissions mode"),
  })
  .strict();

export const ToggleManualTotalEmissionsParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
  subcategoryId: IdSchema.describe("The subcategory ID"),
});
