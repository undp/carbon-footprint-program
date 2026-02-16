import { z } from "zod";
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
