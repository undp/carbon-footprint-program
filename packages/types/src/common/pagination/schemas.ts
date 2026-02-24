import { z } from "zod";

const PaginationSortOrderSchema = z.enum(["asc", "desc"]);

// Pagination metadata
export const BasePaginatedResponseSchema = z.object({
  total: z
    .number()
    .int()
    .optional()
    .describe("Total number of matching records"),
  limit: z.number().int().optional().describe("Number of records per page"),
  offset: z
    .number()
    .int()
    .optional()
    .describe("Starting offset for the current page"),
  totalPages: z
    .number()
    .int()
    .optional()
    .describe("Total number of pages (ceil(total / limit))"),
  hasNext: z
    .boolean()
    .optional()
    .describe("Whether there is a next page (offset + limit < total)"),
  hasPrev: z
    .boolean()
    .optional()
    .describe("Whether there is a previous page (offset > 0)"),
});

export const BasePaginationQuerySchema = z.object({
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
  sortOrder: PaginationSortOrderSchema.optional()
    .default("asc")
    .describe("Sort order (ascending or descending)"),
});
