import { z } from "zod";
import { IdSchema } from "../../zod.js";

export const DeleteEmissionFactorDimensionParamsSchema = z.strictObject({
  id: IdSchema.describe("The ID of the dimension to delete"),
});
