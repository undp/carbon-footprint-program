import { z } from "zod";
import { CommonOrganizationFieldsSchema } from "../../baseSchemas.js";

import {
  BasePaginatedResponseSchema,
  BasePaginationQuerySchema,
} from "../../../common/index.js";
import { OrganizationDisplayStatusSchema } from "../../baseSchemas.js";
import { OrganizationStatus } from "@repo/database";

// Organization list item for admin (with all fields)
const AdminOrganizationListItemSchema = CommonOrganizationFieldsSchema.extend({
  sectorName: z.string().nullable().describe("CountrySector.name"),
  subsectorName: z.string().nullable().describe("CountrySubsector.name"),
  sizeName: z.string().nullable().describe("CountryOrganizationSize.name"),
  status: z.enum(OrganizationStatus),
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

// Sort fields (based on AdminOrganizationListItemSchema fields)
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
    z.string(), // ?statuses=BLOCKED,NOT_ACCREDITED
    z.array(z.string()), // ?statuses=BLOCKED&statuses=NOT_ACCREDITED
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
  .pipe(z.array(OrganizationDisplayStatusSchema));

// Query parameters
export const GetAllOrganizationsQuerySchema = BasePaginationQuerySchema.extend({
  sortBy:
    GetAllOrganizationsSortKeysSchema.optional().describe("Field to sort by"),
  statuses: StatusesQueryParamSchema.optional().describe(
    "Filter by organization statuses (comma-separated, e.g., 'BLOCKED,NOT_ACCREDITED') or array of statuses (e.g., ['BLOCKED', 'NOT_ACCREDITED'])"
  ),
});

// Response schema
export const GetAllOrganizationsResponseSchema =
  BasePaginatedResponseSchema.extend({
    data: z
      .array(AdminOrganizationListItemSchema)
      .describe("Array of organizations"),
  });
