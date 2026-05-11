import { z } from "zod";
import { IdSchema } from "../../zod.js";
import {
  MagnitudeBaseSchema,
  MeasurementUnitBaseSchema,
  MeasurementUnitStatusSchema,
} from "../../baseSchemas/index.js";

const NestedMeasurementUnitSchema = MeasurementUnitBaseSchema.pick({
  id: true,
  name: true,
  magnitudeId: true,
  abbreviation: true,
}).extend({
  magnitude: MagnitudeBaseSchema,
});

const RateMeasurementUnitReferenceCountsSchema = z.object({
  emissionFactors: z
    .number()
    .int()
    .nonnegative()
    .describe("Count of EmissionFactor rows referencing this rate unit."),
  lineInputsAsManualFactor: z
    .number()
    .int()
    .nonnegative()
    .describe(
      "Count of CarbonInventoryLineInput rows with manualFactorRateUnitId set to this rate unit."
    ),
  lineFactorsAsApplied: z
    .number()
    .int()
    .nonnegative()
    .describe(
      "Count of CarbonInventoryLineFactor rows with appliedFactorRateUnitId set to this rate unit."
    ),
});

const RateMeasurementUnitItemSchema = z.object({
  id: IdSchema.describe("The ID of the rate measurement unit"),
  name: z.string().min(1).describe("The name of the rate measurement unit"),
  abbreviation: z
    .string()
    .min(1)
    .describe("The abbreviation of the rate measurement unit"),
  status: MeasurementUnitStatusSchema.describe(
    "The status of the rate measurement unit."
  ),
  numeratorUnit: NestedMeasurementUnitSchema.describe(
    "The numerator measurement unit of the rate measurement unit"
  ),
  denominatorUnit: NestedMeasurementUnitSchema.describe(
    "The denominator measurement unit of the rate measurement unit"
  ),
  referenceCounts: RateMeasurementUnitReferenceCountsSchema.describe(
    "Breakdown of how many records reference this rate unit, by category."
  ),
  totalReferenceCount: z
    .number()
    .int()
    .nonnegative()
    .describe(
      "Sum of the three referenceCounts categories. Derived; used for default sort."
    ),
});

export const GetAllRateMeasurementUnitsResponseSchema = z.array(
  RateMeasurementUnitItemSchema
);
