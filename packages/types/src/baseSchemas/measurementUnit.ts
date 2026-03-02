import { z } from "zod";
import { IdSchema } from "../zod.js";
import { Magnitude } from "@repo/database/enums";

export const MagnitudeSchema = z.enum(Magnitude);

export const MeasurementUnitBaseSchema = z.object({
  id: IdSchema,
  name: z.string(),
  magnitude: MagnitudeSchema,
  abbreviation: z.string(),
  baseFactor: z.number(),
  isBase: z.boolean(),
});
