import { z } from "zod";
import { IdSchema } from "../zod.js";
import { EmissionFactorStatus } from "../enums.js";

// Supports decimal: 123, 12.34, -12, -12.34
// and scientific notation: 1e5, 1.23e-5, -4.3e-7, etc.
const EMISSION_FACTOR_REGEX = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/;

export const EmissionFactorStatusSchema = z
  .enum(EmissionFactorStatus)
  .describe("The status of the emission factor");

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
  gasDetails: z.unknown().describe("The gas details as JSON"),
  value: z
    .string()
    .regex(
      EMISSION_FACTOR_REGEX,
      "Invalid decimal or scientific notation string"
    )
    .describe(
      "The emission factor value as a decimal or scientific notation string"
    ),
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
