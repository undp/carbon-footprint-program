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
        "Emissions per main activity unit, rounded to 2 decimal places"
      ),
    activityName: OrganizationMainActivityBaseSchema.shape.name,
  })
  .strict()
  .nullable()
  .describe("Null if mainActivityQuantity is not defined");
