import { z } from "zod";

const DimensionValueParentSchema = z.object({
  dimension_code: z.string().describe("The code of the parent dimension"),
  value_name: z.string().describe("The name of the parent value"),
});

const DimensionValueSchema = z.object({
  name: z.string().describe("The name of the dimension value"),
  parent_value: DimensionValueParentSchema.nullable().describe(
    "The parent value if this is a nested value"
  ),
});

const EmissionFactorDimensionSchema = z.object({
  code: z.string().describe("The code of the dimension"),
  name: z.string().describe("The name of the dimension"),
  position: z.number().int().describe("The position/order of the dimension"),
  is_required: z.boolean().describe("Whether this dimension is required"),
  values: z
    .array(DimensionValueSchema)
    .describe("The possible values for this dimension"),
});

const SubcategorySchema = z.object({
  name: z.string().describe("The name of the subcategory"),
  description: z
    .string()
    .nullable()
    .describe("The description of the subcategory"),
  examples: z.string().nullable().describe("Examples for the subcategory"),
  emission_factor_dimensions: z
    .array(EmissionFactorDimensionSchema)
    .describe("The emission factor dimensions for this subcategory"),
});

const CategorySchema = z.object({
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

export const GetCurrentMethodologyResponseSchema = z.object({
  country_iso_code: z.string().describe("The ISO code of the country"),
  name: z.string().describe("The name of the methodology"),
  description: z
    .string()
    .nullable()
    .describe("The description of the methodology"),
  status_code: z.string().describe("The status code of the methodology"),
  categories: z
    .array(CategorySchema)
    .describe("The categories in this methodology"),
});

export type GetCurrentMethodologyResponse = z.infer<
  typeof GetCurrentMethodologyResponseSchema
>;
export type Category = z.infer<typeof CategorySchema>;
export type Subcategory = z.infer<typeof SubcategorySchema>;
export type EmissionFactorDimension = z.infer<
  typeof EmissionFactorDimensionSchema
>;
export type DimensionValue = z.infer<typeof DimensionValueSchema>;
export type DimensionValueParent = z.infer<typeof DimensionValueParentSchema>;
