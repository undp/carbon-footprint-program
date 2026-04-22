import { z } from "zod";
import { IdSchema } from "../zod.js";
import { OrganizationDataStatus } from "../enums.js";

export const OrganizationDataStatusSchema = z.enum(OrganizationDataStatus);

export const OrganizationDataBaseSchema = z.object({
  id: IdSchema.describe("The unique identifier for the organization data."),
  organizationId: IdSchema.describe("The ID of the associated organization."),
  status: OrganizationDataStatusSchema.describe(
    "The status of the organization data."
  ),
  legalName: z.string().describe("The legal name of the organization."),
  tradeName: z
    .string()
    .nullable()
    .describe("The trade name of the organization."),
  taxId: z.string().nullable().describe("The tax ID of the organization."),
  countryOrganizationSizeId: IdSchema.nullable().describe(
    "The ID of the associated country organization size."
  ),
  sectorId: IdSchema.nullable().describe("The ID of the associated sector."),
  mainActivityId: IdSchema.nullable().describe(
    "The ID of the associated main activity."
  ),
  subsectorId: IdSchema.nullable().describe(
    "The ID of the associated subsector."
  ),
  address: z.string().nullable().describe("The address of the organization."),
  employeesCount: z
    .number()
    .int()
    .min(0)
    .nullable()
    .describe("The number of employees in the organization."),
  representativeFullName: z
    .string()
    .describe("The full name of the organization's representative."),
  representativeTaxId: z
    .string()
    .describe("The tax ID of the organization's representative."),
  representativeCountryJobPositionId: IdSchema.describe(
    "The ID of the associated country job position for the representative."
  ),
  representativePhone: z
    .string()
    .describe("The phone number of the organization's representative."),
  representativeEmail: z
    .email()
    .describe("The email address of the organization's representative."),
  createdAt: z.iso
    .datetime()
    .describe("The date and time when the organization data was created."),
  updatedAt: z.iso
    .datetime()
    .nullable()
    .describe("The date and time when the organization data was last updated."),
  createdById: IdSchema.nullable().describe(
    "The ID of the user who created the organization data."
  ),
  updatedById: IdSchema.nullable().describe(
    "The ID of the user who last updated the organization data."
  ),
});
