import { z } from "zod";
import { CommonOrganizationFieldsSchema } from "../../schemas.js";

import {
  BasePaginatedResponseSchema,
  BasePaginationQuerySchema,
} from "../../../common/index.js";
import { OrganizationStatusSchema } from "../../../baseSchemas/index.js";

// Organization list item for admin (with all fields)
const AdminOrganizationItemSchema = CommonOrganizationFieldsSchema.extend({
  sectorName: z.string().nullable().describe("CountrySector.name"),
  subsectorName: z.string().nullable().describe("CountrySubsector.name"),
  sizeName: z.string().nullable().describe("CountryOrganizationSize.name"),
  status: OrganizationStatusSchema.describe(
    "Organization status: ACTIVE | BLOCKED"
  ),
  isAccredited: z.boolean(),
  hasCarbonInventories: z
    .boolean()
    .describe(
      "Whether the organization has carbon inventories calculated or in a further stage"
    ),
  lastMeasurement: z.iso
    .datetime()
    .nullable()
    .describe("The last valid carbon inventory date"),
  totalEmissions: z
    .number()
    .describe(
      "SUM of all emissions from organization's carbon inventories that are calculated or in a further stage (COALESCE to 0)"
    ),
});

// Sort fields (based on AdminOrganizationItemSchema fields)
const GetAllOrganizationsSortKeysSchema = z.enum([
  "name",
  "sectorName",
  "subsectorName",
  "sizeName",
  "status",
  "hasCarbonInventories",
  "lastMeasurement",
  "totalEmissions",
]);

const StatusesQueryParamSchema = z
  .union([
    z.string(), // ?statuses=ACTIVE,BLOCKED
    z.array(z.string()), // ?statuses=ACTIVE&statuses=BLOCKED
  ])
  .transform((value) => {
    if (typeof value === "string") {
      return value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    }
    return value;
  })
  .pipe(z.array(OrganizationStatusSchema));

// Query parameters
export const GetAllOrganizationsQuerySchema = BasePaginationQuerySchema.extend({
  sortBy:
    GetAllOrganizationsSortKeysSchema.optional().describe("Field to sort by"),
  statuses: StatusesQueryParamSchema.optional().describe(
    "Filter by organization statuses (comma-separated, e.g., 'ACTIVE,BLOCKED') or array of statuses (e.g., ['ACTIVE', 'BLOCKED'])"
  ),
});

// Response schema
export const GetAllOrganizationsResponseSchema =
  BasePaginatedResponseSchema.extend({
    data: z
      .array(AdminOrganizationItemSchema)
      .describe("Array of organizations"),
  });
