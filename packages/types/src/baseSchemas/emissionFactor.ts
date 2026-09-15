import { z } from "zod";
import { IdSchema } from "../zod.js";
import { EmissionFactorStatus } from "../enums.js";

export const EmissionFactorStatusSchema = z
  .enum(EmissionFactorStatus)
  .describe("The status of the emission factor");

/**
 * Bounds for the emission factor year. Deliberately wide and static: the
 * maintainer offers a sliding window of years, but enforcing that window here
 * would make every factor of the year that drops out uneditable overnight —
 * including for correcting its value, with an error about a field the
 * administrator never touched. The dropdown is where typos are prevented; this
 * bound only stops a `2205`.
 */
export const EMISSION_FACTOR_YEAR_MIN = 1990;
export const EMISSION_FACTOR_YEAR_MAX = 2100;

export const EmissionFactorBaseSchema = z.object({
  id: IdSchema.describe("The ID of the emission factor"),
  subcategoryId: IdSchema.describe("The ID of the subcategory"),
  dimensionValue1Id: IdSchema.nullable().describe(
    "The ID of the first dimension value"
  ),
  dimensionValue2Id: IdSchema.nullable().describe(
    "The ID of the second dimension value"
  ),
  rateMeasurementUnitId: IdSchema.describe(
    "The ID of the rate measurement unit"
  ),
  source: z.string().describe("The source of the emission factor"),
  year: z
    .number()
    .int()
    .min(EMISSION_FACTOR_YEAR_MIN)
    .max(EMISSION_FACTOR_YEAR_MAX)
    .describe("The footprint year the emission factor is valid for"),
  gasDetails: z.unknown().describe("The gas details as JSON"),
  value: z.string().describe("The emission factor value"),
  status: EmissionFactorStatusSchema.describe(
    "The status of the emission factor"
  ),
  createdAt: z.iso
    .datetime()
    .describe("The creation timestamp of the emission factor"),
  updatedAt: z.iso
    .datetime()
    .nullable()
    .describe("The last update timestamp of the emission factor"),
  createdById: IdSchema.nullable().describe(
    "The ID of the user who created the emission factor"
  ),
  updatedById: IdSchema.nullable().describe(
    "The ID of the user who last updated the emission factor"
  ),
});
