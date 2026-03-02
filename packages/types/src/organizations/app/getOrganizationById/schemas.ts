import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import {
  CommonOrganizationFieldsSchema,
  OrganizationDisplayStatusSchema,
} from "../../schemas.js";
import {
  CountryJobPositionBaseSchema,
  CountryOrganizationSizeBaseSchema,
  CountrySectorBaseSchema,
  CountrySubsectorBaseSchema,
  OrganizationMainActivityBaseSchema,
} from "../../../baseSchemas/index.js";

// Path parameters
export const GetOrganizationByIdParamsSchema = z.object({
  id: IdSchema.describe("The organization ID"),
});

// Representative details
const RepresentativeItemSchema = z.object({
  fullName: z.string().describe("Full name of the representative"),
  taxId: z.string().describe("Tax ID of the representative"),
  position: CountryJobPositionBaseSchema.pick({
    id: true,
    name: true,
  }).describe("Job position of the representative"),
  email: z.email().describe("Email of the representative"),
  phone: z.string().describe("Phone number of the representative"),
});

// Response schema: full organization details (for GET endpoints)
export const GetOrganizationByIdResponseSchema =
  CommonOrganizationFieldsSchema.extend({
    taxId: z.string().describe("Tax ID of the organization"),
    legalName: z.string().describe("Legal name of the organization"),
    tradeName: z.string().nullable().describe("Trade name of the organization"),
    isEditable: z.boolean().describe("Whether the organization is editable"),
    sector: z
      .object({
        id: IdSchema.describe("ID of the organization sector"),
        name: CountrySectorBaseSchema.shape.name.describe(
          "Name of the organization sector"
        ),
      })
      .nullable()
      .describe("Organization sector"),
    subsector: z
      .object({
        id: IdSchema.describe("ID of the organization subsector"),
        name: CountrySubsectorBaseSchema.shape.name.describe(
          "Name of the organization subsector"
        ),
      })
      .nullable()
      .describe("Organization subsector"),
    countryOrganizationSize: z
      .object({
        id: IdSchema.describe("ID of the organization size"),
        name: CountryOrganizationSizeBaseSchema.shape.name.describe(
          "Name of the organization size"
        ),
      })
      .nullable()
      .describe("Organization size classification"),
    mainActivity: z
      .object({
        id: IdSchema.describe("ID of the main business activity"),
        name: OrganizationMainActivityBaseSchema.shape.name.describe(
          "Name of the main business activity"
        ),
      })
      .nullable()
      .describe("Main business activity"),
    address: z.string().nullable().describe("Physical address"),
    employeesCount: z.number().int().nullable().describe("Number of employees"),
    representative: RepresentativeItemSchema.describe(
      "Organization representative details"
    ),
    status: OrganizationDisplayStatusSchema.describe(
      "Organization status: ACCREDITED | NOT_ACCREDITED | BLOCKED"
    ),
  });
