import { z } from "zod";
import { IdSchema } from "../../zod.js";

// Params Schema
export const DeleteSubcategoryParamsSchema = z
  .object({
    id: IdSchema.describe("The ID of the sub-category to delete"),
  })
  .strict();
