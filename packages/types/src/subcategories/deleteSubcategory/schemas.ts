import { z } from "zod";

import { IdSchema } from "../../zod.js";

// Params Schema
export const DeleteSubcategoryParamsSchema = z.strictObject({
  id: IdSchema.describe("The ID of the sub-category to delete"),
});
