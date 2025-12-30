import { z } from "zod";

const DimensionValueSchema = z.object({
  id: z.string().regex(/^\d+$/).describe("The ID of the dimension value"),
  value: z.string().describe("The value of the dimension value"),
  parent_value_id: z
    .string()
    .regex(/^\d+$/)
    .nullable()
    .describe("The ID of the parent value if this is a nested value"),
});

const EmissionFactorDimensionSchema = z.object({
  id: z.string().regex(/^\d+$/).describe("The ID of the dimension"),
  name: z.string().describe("The name of the dimension"),
  position: z.number().int().describe("The position/order of the dimension"),
  is_required: z.boolean().describe("Whether this dimension is required"),
  values: z
    .array(DimensionValueSchema)
    .describe("The possible values for this dimension"),
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
