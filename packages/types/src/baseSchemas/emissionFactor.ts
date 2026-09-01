import { z } from "zod";
import {
  EMISSION_FACTOR_YEAR_MAX,
  EMISSION_FACTOR_YEAR_MIN,
} from "@repo/constants";
import { IdSchema } from "../zod.js";
import { EmissionFactorStatus } from "../enums.js";

export const EmissionFactorStatusSchema = z
  .enum(EmissionFactorStatus)
  .describe("The status of the emission factor");

/**
 * Reporting year the factor applies to. `null` means transversal: the factor is
 * confirmed applicable to every reporting year. It never means "unknown", so a
 * caller that does not know the year must not send `null` to mean so.
 *
 * Bounded because the year is part of the factor's identity and drives the
 * vintage ranking: an unbounded integer lets a typo win the recommendation and
 * flag every line that uses it as mismatched.
 */
export const EmissionFactorYearSchema = z
  .number()
  .int()
  .min(EMISSION_FACTOR_YEAR_MIN, {
    message: `Year must be greater than or equal to ${EMISSION_FACTOR_YEAR_MIN}`,
  })
  .max(EMISSION_FACTOR_YEAR_MAX, {
    message: `Year must be less than or equal to ${EMISSION_FACTOR_YEAR_MAX}`,
  })
  .nullable()
  .describe(
    "The reporting year the emission factor applies to; null means transversal (applies to every year)"
  );

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
  year: EmissionFactorYearSchema,
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
