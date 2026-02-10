import { z } from "zod";

export const GetMainActivityEquivalenceResponseSchema = z
  .object({
    rate: z
      .number()
      .nonnegative()
      .describe(
        "Emissions per main activity unit, rounded to 2 decimal places"
      ),
    activityName: z.string().describe("The name of the main activity"),
  })
  .strict()
  .nullable()
  .describe("Null if mainActivityQuantity is not defined");
