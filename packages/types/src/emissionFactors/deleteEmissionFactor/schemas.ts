import { z } from "zod";
import { IdSchema } from "../../zod.js";

export const DeleteEmissionFactorParamsSchema = z.strictObject({
  id: IdSchema.describe("The ID of the emission factor to delete"),
});
