import { z } from "zod";
import { IdSchema } from "../../../zod.js";

export const GetValidFootprintYearsParamsSchema = z.object({
  orgId: IdSchema.describe("The organization ID"),
});

export const GetValidFootprintYearsResponseSchema = z.array(
  z.number().int().describe("A valid footprint year")
);
