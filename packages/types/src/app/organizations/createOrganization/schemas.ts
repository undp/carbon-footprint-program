import { z } from "zod";
import { IdSchema } from "../../../zod.js";

export const CreateOrganizationBodySchema = z
  .object({
    legalName: z.string().min(1).describe("The legal name of the organization"),
    taxId: z.string().min(1).describe("The tax ID (RUC) of the organization"),
    representativeFullName: z
      .string()
      .min(1)
      .describe("The full name of the legal representative"),
    representativeTaxId: z
      .string()
      .min(1)
      .describe("The tax ID (DNI/CE) of the legal representative"),
    representativeCountryJobPositionId: IdSchema.describe(
      "The ID of the job position of the legal representative"
    ),
    representativePhone: z
      .string()
      .min(1)
      .describe("The phone number of the legal representative"),
    representativeEmail: z
      .email()
      .describe("The email address of the legal representative"),
    tradeName: z
      .string()
      .optional()
      .nullable()
      .describe("The trade name of the organization"),
    countryOrganizationSizeId: IdSchema.optional()
      .nullable()
      .describe("The ID of the organization size"),
    sectorId: IdSchema.optional().nullable().describe("The ID of the sector"),
    subsectorId: IdSchema.optional()
      .nullable()
      .describe("The ID of the subsector"),
    address: z
      .string()
      .optional()
      .nullable()
      .describe("The address of the organization"),
    workersCount: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .nullable()
      .describe("The number of workers in the organization"),
  })
  .strict();

export const CreateOrganizationResponseSchema = z.object({
  organizationId: IdSchema.describe("The created organization ID"),
  organizationDataId: IdSchema.describe("The created organization data ID"),
});
