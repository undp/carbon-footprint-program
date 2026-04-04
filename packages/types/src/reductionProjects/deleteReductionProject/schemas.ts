import { z } from "zod";
import { IdSchema } from "../../zod.js";

export const DeleteReductionProjectParamsSchema = z.object({
  id: IdSchema.describe("The reduction project ID"),
});

export const DeleteReductionProjectResponseSchema = z
  .null()
  .describe("Successfully deleted");
