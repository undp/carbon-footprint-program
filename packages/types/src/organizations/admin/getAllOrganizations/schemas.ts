import { z } from "zod";
import { OrganizationDisplayStatusSchema } from "../../baseSchemas.js";

import { IdSchema } from "../../../zod.js";
import {
  PaginationMetadataSchema,
  PaginationSortOrderSchema,
} from "../../../common/index.js";

// Organization list item for admin (with all fields)
const AdminOrganizationListItemSchema = z.object({
  id: IdSchema.describe("The organization ID"),
  name: z
    .string()
    .describe(
      "Display name: COALESCE(trade_name, legal_name, tax_id) from OrganizationData"
    ),
  sectorName: z.string().nullable().describe("CountrySector.name"),
  subsectorName: z.string().nullable().describe("CountrySubsector.name"),
  sizeName: z.string().nullable().describe("CountryOrganizationSize.name"),
  status: OrganizationDisplayStatusSchema.describe(
    "ACCREDITED | NOT_ACCREDITED | BLOCKED"
  ),
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
export const GetAllOrganizationsQuerySchema = z.object({
  limit: z
    .string()
    .regex(/^\d+$/, "Limit must be a valid number")
    .transform((val) => Number(val))
    .optional()
    .describe("Number of records per page"),
  offset: z
    .string()
    .regex(/^\d+$/, "Offset must be a valid number")
    .transform((val) => Number(val))
    .optional()
    .describe("Starting offset for pagination"),
  sortBy:
    GetAllOrganizationsSortBySchema.optional().describe("Field to sort by"),
  sortOrder: PaginationSortOrderSchema.optional()
    .default("asc")
    .describe("Sort order (ascending or descending)"),
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
  PaginationMetadataSchema.extend({
    data: z
      .array(AdminOrganizationListItemSchema)
      .describe("Array of organizations"),
  });
