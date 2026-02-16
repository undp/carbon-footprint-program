import { z } from "zod";
import { OrganizationStatus } from "../../../enums.js";

// Individual KPI count schema
const OrganizationKpiCountSchema = z.object({
  status: z
    .enum(OrganizationStatus)
    .describe("Organization status (ACTIVE or BLOCKED)"),
  accredited: z.boolean().describe("Whether the organization is accredited"),
  withInventories: z
    .boolean()
    .describe("Whether the organization has carbon inventories"),
  count: z
    .number()
    .int()
    .nonnegative()
    .describe("Number of organizations matching criteria"),
});

// Response schema
export const GetOrganizationKpisResponseSchema = z.object({
  total: z
    .number()
    .int()
    .nonnegative()
    .describe("Total number of organizations"),
  counts: z
    .array(OrganizationKpiCountSchema)
    .describe(
      "Breakdown of organizations by status, accreditation, and inventories"
    ),
});
