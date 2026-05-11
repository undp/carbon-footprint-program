import { z } from "zod";
import { IdSchema } from "../../zod.js";
import {
  CategoryBaseSchema,
  EmissionFactorBaseSchema,
  EmissionFactorDimensionBaseSchema,
  EmissionFactorDimensionValueBaseSchema,
  GasDetailsSchema,
  MeasurementUnitBaseSchema,
  MethodologyVersionBaseSchema,
  RateMeasurementUnitBaseSchema,
  SubcategoryBaseSchema,
} from "../../baseSchemas/index.js";

export const GetMethodologyExportParamsSchema = z
  .object({
    id: IdSchema.describe("The ID of the methodology to export"),
  })
  .strict();

const ExportDimensionValueSchema = EmissionFactorDimensionValueBaseSchema.pick({
  id: true,
  value: true,
});

const ExportDimensionSchema = EmissionFactorDimensionBaseSchema.pick({
  id: true,
  name: true,
  position: true,
  isRequired: true,
}).extend({
  values: z
    .array(ExportDimensionValueSchema)
    .describe("Active dimension values for the dimension"),
});

const ExportRateMeasurementUnitSchema = RateMeasurementUnitBaseSchema.pick({
  id: true,
  name: true,
  abbreviation: true,
});

const ExportEmissionFactorDimensionValueSchema =
  EmissionFactorDimensionValueBaseSchema.pick({
    id: true,
    value: true,
  });

const ExportEmissionFactorSchema = EmissionFactorBaseSchema.pick({
  id: true,
  source: true,
  value: true,
}).extend({
  gasDetails: GasDetailsSchema.describe(
    "Per-gas breakdown for the emission factor"
  ),
  dimensionValue1: ExportEmissionFactorDimensionValueSchema.nullable().describe(
    "First dimension value, when present"
  ),
  dimensionValue2: ExportEmissionFactorDimensionValueSchema.nullable().describe(
    "Second dimension value, when present"
  ),
  rateMeasurementUnit: ExportRateMeasurementUnitSchema.describe(
    "Rate measurement unit for the factor value"
  ),
});

const ExportMeasurementUnitSchema = MeasurementUnitBaseSchema.pick({
  id: true,
  name: true,
  abbreviation: true,
});

const ExportSubcategorySchema = SubcategoryBaseSchema.pick({
  id: true,
  name: true,
  description: true,
}).extend({
  measurementUnits: z
    .array(ExportMeasurementUnitSchema)
    .describe("Accepted measurement units for the subcategory"),
  dimensions: z
    .array(ExportDimensionSchema)
    .describe("Active dimensions for the subcategory, ordered by position"),
  emissionFactors: z
    .array(ExportEmissionFactorSchema)
    .describe("Active emission factors for the subcategory"),
});

const ExportCategorySchema = CategoryBaseSchema.pick({
  id: true,
  name: true,
  position: true,
  synonyms: true,
  description: true,
}).extend({
  subcategories: z
    .array(ExportSubcategorySchema)
    .describe("Active subcategories for the category, ordered by name"),
});

export const GetMethodologyExportResponseSchema =
  MethodologyVersionBaseSchema.pick({
    id: true,
    name: true,
    description: true,
    regulation: true,
    version: true,
    status: true,
  }).extend({
    categories: z
      .array(ExportCategorySchema)
      .describe(
        "Active categories of the methodology, ordered by position ascending, with full export payload"
      ),
  });
