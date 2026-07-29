import { z } from "zod";
import { OrganizationMainActivityBaseSchema } from "../../baseSchemas/organizationMainActivity.js";
import { IdSchema } from "../../zod.js";

export const GetMainActivityEquivalenceParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const GetMainActivityEquivalenceResponseSchema = z
  .object({
    rate: z
      .number()
      .nonnegative()
      .describe(
        "Emissions in tCO2e per unit of the main activity, with full precision"
      ),
    activityName: OrganizationMainActivityBaseSchema.shape.name,
  })
  .strict()
  .nullable()
  .describe("Null if mainActivityQuantity is not defined");
