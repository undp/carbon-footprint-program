import { z } from "zod";
import { YearQueryParamSchema } from "../../../common/queryParams/schemas.js";

export const GetAdminDashboardKpisQuerySchema = z.object({
  year: YearQueryParamSchema,
});

export const GetAdminDashboardKpisResponseSchema = z.object({
  totalOrganizations: z
    .number()
    .int()
    .nonnegative()
    .describe("Total number of enrolled organizations"),
  measuringOrganizations: z
    .number()
    .int()
    .nonnegative()
    .describe(
      "Enrolled organizations with at least one active self-declared inventory"
    ),
  totalEmissions: z
    .number()
    .nonnegative()
    .describe("Total emissions from self-declared ACTIVE inventories in tCO2e"),
  verifiedEmissions: z
    .number()
    .nonnegative()
    .describe("Verified emissions from verified ACTIVE inventories in tCO2e"),
  recognitionsEarned: z
    .number()
    .int()
    .nonnegative()
    .describe(
      "Total approved recognitions (APPROVED + APPROVED_AUTOMATICALLY)"
    ),
  recognitionsUnderReview: z
    .number()
    .int()
    .nonnegative()
    .describe("Total recognitions pending review"),
});
