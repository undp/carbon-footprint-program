import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { EmissionFactorBaseSchema } from "../../baseSchemas/index.js";

export const GetEmissionFactorYearsParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const GetEmissionFactorYearsResponseSchema = z
  .array(EmissionFactorBaseSchema.shape.year)
  .describe(
    "The footprint years the methodology of this inventory has factors for, oldest first"
  );
