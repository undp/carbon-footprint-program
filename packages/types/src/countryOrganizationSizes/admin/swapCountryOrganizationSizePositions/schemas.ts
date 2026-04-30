import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { AdminCountryOrganizationSizeSchema } from "../shared/schemas.js";

export const SwapCountryOrganizationSizePositionsRequestSchema = z.strictObject(
  {
    sizeIdA: IdSchema.describe("The ID of the first country organization size"),
    sizeIdB: IdSchema.describe(
      "The ID of the second country organization size"
    ),
  }
);

export const SwapCountryOrganizationSizePositionsResponseSchema = z.object({
  organizationSizes: z
    .array(AdminCountryOrganizationSizeSchema)
    .length(2)
    .describe("The two organization sizes with their positions swapped"),
});
