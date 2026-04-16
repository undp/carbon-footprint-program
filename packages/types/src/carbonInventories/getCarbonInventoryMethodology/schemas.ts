import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { SubcategoryBaseSchema } from "../../baseSchemas/subcategory.js";
import {
  CategoryBaseSchema,
  EmissionFactorBaseSchema,
  EmissionFactorDimensionBaseSchema,
  EmissionFactorDimensionValueBaseSchema,
} from "../../baseSchemas/index.js";

export const GetCarbonInventoryMethodologyParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

const DimensionValueItemSchema = EmissionFactorDimensionValueBaseSchema.pick({
  id: true,
  value: true,
  parentValueId: true,
});

const DimensionItemSchema = EmissionFactorDimensionBaseSchema.pick({
  id: true,
  name: true,
  position: true,
  isRequired: true,
}).extend({
  values: z
    .array(DimensionValueItemSchema)
    .describe("The possible values for this dimension"),
});

const EmissionFactorItemSchema = EmissionFactorBaseSchema.pick({
  dimensionValue1Id: true,
  dimensionValue2Id: true,
  rateMeasurementUnitId: true,
  source: true,
  gasDetails: true,
})
  .extend({
    value: z
      .string()
      .describe(
        "The emission factor value as a string to preserve decimal precision"
      ),
    id: z
      .string()
      .describe(
        "The ID of the emission factor. For original factors, this is a numeric string (e.g., '123'). For converted factors, this is a composite string in the format 'originalEmissionFactorId-conversionNumber' (e.g., '123-1' for the first conversion of original factor '123')."
      ),
    originalEmissionFactorId: IdSchema.nullable().describe(
      "The ID of the original emission factor. Null for original factors, set for converted factors."
    ),
  })
  .refine(
    (data) => {
      if (data.originalEmissionFactorId === null) {
        // If originalEmissionFactorId is null, id must be purely numeric
        return /^\d+$/.test(data.id);
      } else {
        // If originalEmissionFactorId is not null, id must be composite form and start with originalEmissionFactorId-
        return (
          /^\d+-\d+$/.test(data.id) &&
          data.id.startsWith(`${data.originalEmissionFactorId}-`)
        );
      }
    },
    {
      message:
        "id format is invalid: if originalEmissionFactorId is null, id must be purely numeric (e.g., '123'); otherwise, when originalEmissionFactorId is set, id must be a composite 'NNN-MMM' AND begin with 'originalEmissionFactorId-' (e.g., '123-456' when originalEmissionFactorId is '123')",
    }
  );

const SubcategorySchema = SubcategoryBaseSchema.pick({
  id: true,
  name: true,
  icon: true,
  description: true,
  examples: true,
  explanationSlug: true,
}).extend({
  dimensions: z
    .array(DimensionItemSchema)
    .describe("The emission factor dimensions for this subcategory"),
  emissionFactors: z
    .array(EmissionFactorItemSchema)
    .describe("The emission factors for this subcategory"),
  allowedMeasurementUnitIds: z
    .array(IdSchema)
    .describe("The IDs of the allowed measurement units for this subcategory"),
});

const InventoryCategorySchema = CategoryBaseSchema.pick({
  id: true,
  name: true,
  icon: true,
  color: true,
  synonyms: true,
  description: true,
  explanationSlug: true,
  examples: true,
  position: true,
}).extend({
  subcategories: z
    .array(SubcategorySchema)
    .describe("The subcategories in this category"),
});

export const GetCarbonInventoryMethodologyResponseSchema = z.object({
  name: z.string().describe("The name of the methodology"),
  description: z
    .string()
    .nullable()
    .describe("The description of the methodology"),
  categories: z
    .array(InventoryCategorySchema)
    .describe("The categories in this methodology"),
});
