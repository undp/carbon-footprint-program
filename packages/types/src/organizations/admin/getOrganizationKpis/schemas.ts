import { z } from "zod";
import { OrganizationStatus } from "@repo/database/enums";

// Individual KPI count schema
const BaseCountSchema = z.object({
  count: z
    .number()
    .int()
    .nonnegative()
    .describe("Number of organizations matching criteria"),
});

const OrganizationKpiCountSchema = z.union([
  // ACTIVE combinations
  BaseCountSchema.extend({
    status: z.literal(OrganizationStatus.ACTIVE),
    accredited: z.literal(true),
    withInventories: z.literal(true),
  }),
  BaseCountSchema.extend({
    status: z.literal(OrganizationStatus.ACTIVE),
    accredited: z.literal(true),
    withInventories: z.literal(false),
  }),
  BaseCountSchema.extend({
    status: z.literal(OrganizationStatus.ACTIVE),
    accredited: z.literal(false),
    withInventories: z.literal(true),
  }),
  BaseCountSchema.extend({
    status: z.literal(OrganizationStatus.ACTIVE),
    accredited: z.literal(false),
    withInventories: z.literal(false),
  }),
  // BLOCKED combinations
  BaseCountSchema.extend({
    status: z.literal(OrganizationStatus.BLOCKED),
    accredited: z.literal(true),
    withInventories: z.literal(true),
  }),
  BaseCountSchema.extend({
    status: z.literal(OrganizationStatus.BLOCKED),
    accredited: z.literal(true),
    withInventories: z.literal(false),
  }),
  BaseCountSchema.extend({
    status: z.literal(OrganizationStatus.BLOCKED),
    accredited: z.literal(false),
    withInventories: z.literal(true),
  }),
  BaseCountSchema.extend({
    status: z.literal(OrganizationStatus.BLOCKED),
    accredited: z.literal(false),
    withInventories: z.literal(false),
  }),
]);

// Response schema
export const GetOrganizationKpisResponseSchema = z.object({
  total: z
    .number()
    .int()
    .nonnegative()
    .describe("Total number of organizations"),
  counts: z
    .array(OrganizationKpiCountSchema)
    .length(8)
    .describe(
      "Breakdown of organizations by all possible combinations of status, accreditation, and inventories"
    )
    .refine(
      (items) => {
        const unique = new Set(
          items.map((i) => `${i.status}-${i.accredited}-${i.withInventories}`)
        );
        return unique.size === 8;
      },
      {
        message:
          "Must include all 8 unique combinations of status, accreditation, and inventories",
      }
    ),
});
