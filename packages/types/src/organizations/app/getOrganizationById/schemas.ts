import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import {
  EntityReferenceSchema,
  CommonOrganizationFieldsSchema,
} from "../../baseSchemas.js";

// Representative details
const Representative = z.object({
  fullName: z.string().describe("Full name of the representative"),
  taxId: z.string().describe("Tax ID of the representative"),
  position: EntityReferenceSchema.describe(
    "Job position of the representative"
  ),
  email: z.email().describe("Email of the representative"),
  phone: z.string().describe("Phone number of the representative"),
});

// Full organization details (for GET endpoints)
const OrganizationDetailsSchema = CommonOrganizationFieldsSchema.extend({
  taxId: z.string().describe("Tax ID of the organization"),
  legalName: z.string().describe("Legal name of the organization"),
  tradeName: z.string().nullable().describe("Trade name of the organization"),
  isEditable: z.boolean().describe("Whether the organization is editable"),
  sector: EntityReferenceSchema.nullable().describe("Organization sector"),
  subsector: EntityReferenceSchema.nullable().describe(
    "Organization subsector"
  ),
  countryOrganizationSize: EntityReferenceSchema.nullable().describe(
    "Organization size classification"
  ),
  mainActivity: EntityReferenceSchema.nullable().describe(
    "Main business activity"
  ),
  address: z.string().nullable().describe("Physical address"),
  employeeCount: z.number().int().nullable().describe("Number of employees"),
  representative: Representative.describe(
    "Organization representative details"
  ),
});

// Path parameters
export const GetOrganizationByIdParamsSchema = z.object({
  id: IdSchema.describe("The organization ID"),
});

// Response schema
export const GetOrganizationByIdResponseSchema = OrganizationDetailsSchema;
