import { z } from "zod";
import { IdSchema } from "../../zod.js";

// Organization mutation data (for POST/PATCH endpoints)
export const OrganizationMutationDataSchema = z.object({
  legalName: z.string().min(1).describe("Legal name of the organization"),
  tradeName: z.string().min(1).describe("Trade name of the organization"),
  taxId: z.string().min(1).describe("Tax ID of the organization"),
  countryOrganizationSizeId: IdSchema.describe(
    "ID of the organization size classification"
  ),
  sectorId: IdSchema.describe("ID of the organization sector"),
  subsectorId: IdSchema.describe("ID of the organization subsector"),
  employeesCount: z.number().int().describe("Number of employees"),
  address: z.string().min(1).describe("Physical address"),
  representativeFullName: z
    .string()
    .min(1)
    .describe("Full name of representative"),
  representativeTaxId: z.string().min(1).describe("Tax ID of representative"),
  representativePositionId: IdSchema.describe(
    "ID of representative's job position"
  ),
  representativePhone: z.string().min(1).describe("Phone of representative"),
  representativeEmail: z.email().describe("Email of representative"),
  mainActivityId: IdSchema.describe("ID of the main business activity"),
});
