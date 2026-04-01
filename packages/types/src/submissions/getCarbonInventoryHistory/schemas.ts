import { z } from "zod";
import { IdSchema } from "../../zod.js";

export const GetCarbonInventoryHistoryParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});
