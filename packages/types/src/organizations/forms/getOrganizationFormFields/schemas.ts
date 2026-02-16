import { z } from "zod";
import { OrganizationMutationDataSchema } from "../../baseSchemas.js";

// Form field schema
const OrganizationFormFieldSchema = z.object({
  fieldKey: OrganizationMutationDataSchema.keyof().describe("Field key"),
  fieldLabel: z.string().describe("Field label"),
  required: z.boolean().describe("Whether the field is required"),
});

// Response schema
export const GetOrganizationFormFieldsResponseSchema = z.object({
  fields: z
    .array(OrganizationFormFieldSchema)
    .describe("Array of form field definitions"),
});
