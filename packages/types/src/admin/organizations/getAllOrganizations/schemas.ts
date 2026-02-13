import { z } from "zod";
import {
  PaginationMetadataSchema,
  AdminOrganizationListItemSchema,
} from "../schemas.js";
import { OrganizationDisplayStatusSchema } from "../../../organizations/schemas.js";

// Sort fields (based on AdminOrganizationListItemSchema fields)
export const GetAllOrganizationsSortBySchema = z.enum([
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
export const GetAllOrganizationsSortOrderSchema = z.enum(["asc", "desc"]);

// Query parameters
export const GetAllOrganizationsQuerySchema = z.object({
  limit: z
    .string()
    .regex(/^\d+$/, "Limit must be a valid number")
    .optional()
    .describe("Number of records per page"),
  offset: z
    .string()
    .regex(/^\d+$/, "Offset must be a valid number")
    .optional()
    .describe("Starting offset for pagination"),
  sortBy:
    GetAllOrganizationsSortBySchema.optional().describe("Field to sort by"),
  sortOrder: GetAllOrganizationsSortOrderSchema.optional()
    .default("asc")
    .describe("Sort order (ascending or descending)"),
  statuses: z
    .string()
    .transform((val) => val.split(","))
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
