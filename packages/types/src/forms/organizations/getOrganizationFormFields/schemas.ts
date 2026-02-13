import { z } from "zod";

// Form field schema
export const OrganizationFormFieldSchema = z.object({
  fieldName: z.string().describe("Field name"),
  required: z.boolean().describe("Whether the field is required"),
});

// Response schema
export const GetOrganizationFormFieldsResponseSchema = z.object({
  fields: z
    .array(OrganizationFormFieldSchema)
    .describe("Array of form field definitions"),
});
