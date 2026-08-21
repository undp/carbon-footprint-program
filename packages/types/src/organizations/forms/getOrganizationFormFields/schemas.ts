import { z } from "zod";
import { OrganizationMutationDataSchema } from "../../schemas.js";

// Form field schema
const BaseFormFieldSchema = z.object({
  label: z.string().describe("Field label"),
  required: z.boolean().describe("Whether the field is required"),
});

const OrganizationFormFieldSchema = z.discriminatedUnion("key", [
  BaseFormFieldSchema.extend({ key: z.literal("legalName") }),
  BaseFormFieldSchema.extend({ key: z.literal("tradeName") }),
  BaseFormFieldSchema.extend({ key: z.literal("taxId") }),
  BaseFormFieldSchema.extend({ key: z.literal("countryOrganizationSizeId") }),
  BaseFormFieldSchema.extend({ key: z.literal("sectorId") }),
  BaseFormFieldSchema.extend({ key: z.literal("subsectorId") }),
  BaseFormFieldSchema.extend({ key: z.literal("secondarySubsectorId") }),
  BaseFormFieldSchema.extend({ key: z.literal("territoryId") }),
  BaseFormFieldSchema.extend({ key: z.literal("employeesCount") }),
  BaseFormFieldSchema.extend({ key: z.literal("address") }),
  BaseFormFieldSchema.extend({ key: z.literal("representativeFullName") }),
  BaseFormFieldSchema.extend({ key: z.literal("representativeTaxId") }),
  BaseFormFieldSchema.extend({ key: z.literal("representativePositionId") }),
  BaseFormFieldSchema.extend({ key: z.literal("representativePhone") }),
  BaseFormFieldSchema.extend({ key: z.literal("representativeEmail") }),
  BaseFormFieldSchema.extend({ key: z.literal("mainActivityId") }),
]);

// Response schema
export const GetOrganizationFormFieldsResponseSchema = z.object({
  fields: z
    .array(OrganizationFormFieldSchema)
    .length(OrganizationMutationDataSchema.keyof().options.length)
    .describe("Array of form field definitions")
    .refine(
      (fields) => {
        const mutationKeys = OrganizationMutationDataSchema.keyof().options;
        const fieldKeys = fields.map((f) => f.key);
        // Ensure every key of OrganizationMutationDataSchema is present in the response
        return mutationKeys.every((key) => fieldKeys.includes(key));
      },
      {
        message:
          "The response must include every key of OrganizationMutationDataSchema",
      }
    ),
});
