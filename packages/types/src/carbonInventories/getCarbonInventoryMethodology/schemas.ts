import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { CategorySchema } from "../../categories/index.js";

export const DimensionValueSchema = z.object({
  id: IdSchema.describe("The ID of the dimension value"),
  value: z.string().describe("The value of the dimension value"),
  parentValueId: z
    .string()
    .regex(/^\d+$/)
    .nullable()
    .describe("The ID of the parent value if this is a nested value"),
});

export const EmissionFactorDimensionSchema = z.object({
  id: IdSchema.describe("The ID of the dimension"),
  name: z.string().describe("The name of the dimension"),
  position: z.number().int().describe("The position/order of the dimension"),
  isRequired: z.boolean().describe("Whether this dimension is required"),
  values: z
    .array(DimensionValueSchema)
    .describe("The possible values for this dimension"),
});

export const EmissionFactorSchema = z
  .object({
    id: z
      .string()
      .describe(
        "The ID of the emission factor. For original factors, this is the original ID. For converted factors, this is a composite ID."
      ),
    originalEmissionFactorId: IdSchema.nullable().describe(
      "The ID of the original emission factor. Null for original factors, set for converted factors."
    ),
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
    gasDetails: z.json().describe("The gas details as JSON"),
    value: z.string().describe("The emission factor value as a decimal string"),
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

export const SubcategorySchema = z.object({
  id: IdSchema.describe("The ID of the subcategory"),
  name: z.string().describe("The name of the subcategory"),
  description: z
    .string()
    .nullable()
    .describe("The description of the subcategory"),
  examples: z.string().nullable().describe("Examples for the subcategory"),
  dimensions: z
    .array(EmissionFactorDimensionSchema)
    .describe("The emission factor dimensions for this subcategory"),
  emissionFactors: z
    .array(EmissionFactorSchema)
    .describe("The emission factors for this subcategory"),
  allowedMeasurementUnitIds: z
    .array(IdSchema)
    .describe("The IDs of the allowed measurement units for this subcategory"),
});

export const InventoryCategorySchema = CategorySchema.pick({
  id: true,
  name: true,
  icon: true,
  color: true,
  synonyms: true,
  description: true,
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
