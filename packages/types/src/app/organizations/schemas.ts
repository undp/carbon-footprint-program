import { z } from "zod";
import { IdSchema } from "../../zod.js";
import {
  EntityReferenceSchema,
  OrganizationDisplayStatusSchema,
} from "../../organizations/schemas.js";

/**
 * Shared schemas used by app organization endpoints
 */

// Representative details
export const RepresentativeSchema = z.object({
  name: z.string().describe("Full name of the representative"),
  taxId: z.string().describe("Tax ID of the representative"),
  position: EntityReferenceSchema.describe(
    "Job position of the representative"
  ),
  email: z.email().describe("Email of the representative"),
  phone: z.string().describe("Phone number of the representative"),
});

// Full organization details (for GET endpoints)
export const OrganizationDetailsSchema = z.object({
  id: IdSchema.describe("The organization ID"),
  name: z.string().describe("Display name of the organization"),
  taxId: z.string().describe("Tax ID of the organization"),
  legalName: z.string().describe("Legal name of the organization"),
  status: OrganizationDisplayStatusSchema.describe(
    "Organization status: ACCREDITED | NOT_ACCREDITED | BLOCKED"
  ),
  sector: EntityReferenceSchema.describe("Organization sector"),
  subsector: EntityReferenceSchema.describe("Organization subsector"),
  countryOrganizationSize: EntityReferenceSchema.describe(
    "Organization size classification"
  ),
  mainActivity: EntityReferenceSchema.describe("Main business activity"),
  address: z.string().describe("Physical address"),
  region: z.string().describe("Region/state"),
  employeeCount: z.number().int().describe("Number of employees"),
  representative: RepresentativeSchema.describe(
    "Organization representative details"
  ),
});

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
  employeeCount: z.number().int().describe("Number of employees"),
  address: z.string().min(1).describe("Physical address"),
  representativeName: z.string().min(1).describe("Full name of representative"),
  representativeTaxId: z.string().min(1).describe("Tax ID of representative"),
  representativePositionId: IdSchema.describe(
    "ID of representative's job position"
  ),
  representativePhone: z.string().min(1).describe("Phone of representative"),
  mainActivityId: IdSchema.describe("ID of the main business activity"),
});
