import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { OrganizationDisplayStatusSchema } from "../../organizations/schemas.js";

/**
 * Shared schemas used by admin organization endpoints
 */

// Pagination metadata
export const PaginationMetadataSchema = z.object({
  total: z.number().int().describe("Total number of matching records"),
  limit: z.number().int().describe("Number of records per page"),
  offset: z.number().int().describe("Starting offset for the current page"),
  totalPages: z
    .number()
    .int()
    .describe("Total number of pages (ceil(total / limit))"),
  hasNext: z
    .boolean()
    .describe("Whether there is a next page (offset + limit < total)"),
  hasPrev: z
    .boolean()
    .describe("Whether there is a previous page (offset > 0)"),
});

// Organization list item for admin (with all fields)
export const AdminOrganizationListItemSchema = z.object({
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
    .describe("Whether the organization has any carbon inventories"),
  lastEdition: z.iso.datetime().describe("organization.updated_at"),
  totalEmissions: z
    .number()
    .describe(
      "SUM of all emissions from carbon_inventory_subtotals_view (COALESCE to 0)"
    ),
});
