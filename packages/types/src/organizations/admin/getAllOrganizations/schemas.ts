import { z } from "zod";
import { CommonOrganizationFieldsSchema } from "../../baseSchemas.js";

import {
  BasePaginatedResponseSchema,
  BasePaginationQuerySchema,
} from "../../../common/index.js";
import { OrganizationDisplayStatusSchema } from "../../baseSchemas.js";

// Organization list item for admin (with all fields)
const AdminOrganizationListItemSchema = CommonOrganizationFieldsSchema.extend({
  sectorName: z.string().nullable().describe("CountrySector.name"),
  subsectorName: z.string().nullable().describe("CountrySubsector.name"),
  sizeName: z.string().nullable().describe("CountryOrganizationSize.name"),
  hasCarbonInventories: z
    .boolean()
    .describe("Whether the organization has any calculated carbon inventories"),
  lastEdition: z.iso.datetime().describe("organization.updated_at"),
  totalEmissions: z
    .number()
    .describe(
      "SUM of all emissions from calculated carbon inventories (COALESCE to 0)"
    ),
});

// Sort fields (based on AdminOrganizationListItemSchema fields)
const GetAllOrganizationsSortBySchema = z.enum([
  "name",
  "sectorName",
  "subsectorName",
  "sizeName",
  "status",
  "hasCarbonInventories",
  "lastEdition",
  "totalEmissions",
]);

// Sort order

// Query parameters
export const GetAllOrganizationsQuerySchema = BasePaginationQuerySchema.extend({
  sortBy:
    GetAllOrganizationsSortBySchema.optional().describe("Field to sort by"),
  statuses: z
    .string()
    .transform((val) =>
      val
        .split(",")
        .map((status) => status.trim())
        .filter(Boolean)
    )
    .pipe(z.array(OrganizationDisplayStatusSchema))
    .optional()
    .describe(
      "Filter by organization statuses (comma-separated, e.g., 'BLOCKED,NOT_ACCREDITED')"
    ),
});

// Response schema
export const GetAllOrganizationsResponseSchema =
  BasePaginatedResponseSchema.extend({
    data: z
      .array(AdminOrganizationListItemSchema)
      .describe("Array of organizations"),
  });
