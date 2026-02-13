import { z } from "zod";
import {
  PaginationMetadataSchema,
  AdminOrganizationListItemSchema,
} from "../schemas.js";

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
});

// Response schema
export const GetAllOrganizationsResponseSchema =
  PaginationMetadataSchema.extend({
    data: z
      .array(AdminOrganizationListItemSchema)
      .describe("Array of organizations"),
  });
