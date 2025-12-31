import { z } from "zod";

const DimensionValueSchema = z.object({
  id: z.string().regex(/^\d+$/).describe("The ID of the dimension value"),
  value: z.string().describe("The value of the dimension value"),
  parentValueId: z
    .string()
    .regex(/^\d+$/)
    .nullable()
    .describe("The ID of the parent value if this is a nested value"),
});

const EmissionFactorDimensionSchema = z.object({
  id: z.string().regex(/^\d+$/).describe("The ID of the dimension"),
  name: z.string().describe("The name of the dimension"),
  position: z.number().int().describe("The position/order of the dimension"),
  isRequired: z.boolean().describe("Whether this dimension is required"),
  values: z
    .array(DimensionValueSchema)
    .describe("The possible values for this dimension"),
});

const EmissionFactorSchema = z.object({
  id: z.string().regex(/^\d+$/).describe("The ID of the emission factor"),
  dimensionValue1Id: z
    .string()
    .regex(/^\d+$/)
    .nullable()
    .describe("The ID of the first dimension value"),
  dimensionValue2Id: z
    .string()
    .regex(/^\d+$/)
    .nullable()
    .describe("The ID of the second dimension value"),
  rateMeasurementUnitId: z
    .string()
    .regex(/^\d+$/)
    .describe("The ID of the rate measurement unit"),
  source: z.string().describe("The source of the emission factor"),
  gasDetails: z.json().describe("The gas details as JSON"),
  value: z.string().describe("The emission factor value as a decimal string"),
});

const SubcategorySchema = z.object({
  id: z.string().regex(/^\d+$/).describe("The ID of the subcategory"),
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
});

const CategorySchema = z.object({
  id: z.string().regex(/^\d+$/).describe("The ID of the category"),
  name: z.string().describe("The name of the category"),
  synonyms: z.string().nullable().describe("Synonyms for the category"),
  description: z
    .string()
    .nullable()
    .describe("The description of the category"),
  examples: z.string().nullable().describe("Examples for the category"),
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
    .array(CategorySchema)
    .describe("The categories in this methodology"),
});

export type GetCarbonInventoryMethodologyResponse = z.infer<
  typeof GetCarbonInventoryMethodologyResponseSchema
>;
