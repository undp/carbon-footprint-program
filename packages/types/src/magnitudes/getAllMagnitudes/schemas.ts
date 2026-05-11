import { z } from "zod";
import { MagnitudeBaseSchema } from "../../baseSchemas/magnitude.js";

export const GetAllMagnitudesResponseSchema = z.array(
  MagnitudeBaseSchema.extend({
    referenceCount: z.number().int().nonnegative(),
  })
);
