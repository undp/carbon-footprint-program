import { z } from "zod";
import { OrganizationMainActivityBaseSchema } from "../../baseSchemas/organizationMainActivity.js";

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
