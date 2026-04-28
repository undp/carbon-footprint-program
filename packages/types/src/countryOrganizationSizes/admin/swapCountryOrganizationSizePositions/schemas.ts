import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { AdminCountryOrganizationSizeSchema } from "../shared/schemas.js";

export const SwapCountryOrganizationSizePositionsRequestSchema = z.strictObject(
  {
    sizeIdA: IdSchema.describe("ID del primer tamaño de organización"),
    sizeIdB: IdSchema.describe("ID del segundo tamaño de organización"),
  }
);

export const SwapCountryOrganizationSizePositionsResponseSchema = z.object({
  organizationSizes: z
    .array(AdminCountryOrganizationSizeSchema)
    .length(2)
    .describe("Los dos tamaños con sus posiciones intercambiadas"),
});
