import { SubmissionType, SubmissionStatus } from "@repo/database/enums";
import { z } from "zod";
import { YearQueryParamSchema } from "../../../common/queryParams/schemas.js";

export const GetAdminRequestsKpisQuerySchema = z.object({
  year: YearQueryParamSchema,
});

// Individual KPI count schema
const BaseCountSchema = z.object({
  value: z
    .number()
    .int()
    .nonnegative()
    .describe("Number of organizations matching criteria"),
});

const RequestKpiCountSchema = z.union([
  // ORGANIZATION_ACCREDITATION
  BaseCountSchema.extend({
    type: z.literal(SubmissionType.ORGANIZATION_ACCREDITATION),
    status: z.literal(SubmissionStatus.PENDING),
  }),
  BaseCountSchema.extend({
    type: z.literal(SubmissionType.ORGANIZATION_ACCREDITATION),
    status: z.literal(SubmissionStatus.APPROVED),
  }),
  BaseCountSchema.extend({
    type: z.literal(SubmissionType.ORGANIZATION_ACCREDITATION),
    status: z.literal(SubmissionStatus.APPROVED_AUTOMATICALLY),
  }),
  BaseCountSchema.extend({
    type: z.literal(SubmissionType.ORGANIZATION_ACCREDITATION),
    status: z.literal(SubmissionStatus.REVIEWED),
  }),
  BaseCountSchema.extend({
    type: z.literal(SubmissionType.ORGANIZATION_ACCREDITATION),
    status: z.literal(SubmissionStatus.REJECTED),
  }),
  // CARBON_INVENTORY_CALCULATION
  BaseCountSchema.extend({
    type: z.literal(SubmissionType.CARBON_INVENTORY_CALCULATION),
    status: z.literal(SubmissionStatus.PENDING),
  }),
  BaseCountSchema.extend({
    type: z.literal(SubmissionType.CARBON_INVENTORY_CALCULATION),
    status: z.literal(SubmissionStatus.APPROVED),
  }),
  BaseCountSchema.extend({
    type: z.literal(SubmissionType.CARBON_INVENTORY_CALCULATION),
    status: z.literal(SubmissionStatus.APPROVED_AUTOMATICALLY),
  }),
  BaseCountSchema.extend({
    type: z.literal(SubmissionType.CARBON_INVENTORY_CALCULATION),
    status: z.literal(SubmissionStatus.REVIEWED),
  }),
  BaseCountSchema.extend({
    type: z.literal(SubmissionType.CARBON_INVENTORY_CALCULATION),
    status: z.literal(SubmissionStatus.REJECTED),
  }),
  // CARBON_INVENTORY_VERIFICATION
  BaseCountSchema.extend({
    type: z.literal(SubmissionType.CARBON_INVENTORY_VERIFICATION),
    status: z.literal(SubmissionStatus.PENDING),
  }),
  BaseCountSchema.extend({
    type: z.literal(SubmissionType.CARBON_INVENTORY_VERIFICATION),
    status: z.literal(SubmissionStatus.APPROVED),
  }),
  BaseCountSchema.extend({
    type: z.literal(SubmissionType.CARBON_INVENTORY_VERIFICATION),
    status: z.literal(SubmissionStatus.APPROVED_AUTOMATICALLY),
  }),
  BaseCountSchema.extend({
    type: z.literal(SubmissionType.CARBON_INVENTORY_VERIFICATION),
    status: z.literal(SubmissionStatus.REVIEWED),
  }),
  BaseCountSchema.extend({
    type: z.literal(SubmissionType.CARBON_INVENTORY_VERIFICATION),
    status: z.literal(SubmissionStatus.REJECTED),
  }),
  // REDUCTION_PROJECT_VERIFICATION
  BaseCountSchema.extend({
    type: z.literal(SubmissionType.REDUCTION_PROJECT_VERIFICATION),
    status: z.literal(SubmissionStatus.PENDING),
  }),
  BaseCountSchema.extend({
    type: z.literal(SubmissionType.REDUCTION_PROJECT_VERIFICATION),
    status: z.literal(SubmissionStatus.APPROVED),
  }),
  BaseCountSchema.extend({
    type: z.literal(SubmissionType.REDUCTION_PLAN_VERIFICATION),
    status: z.literal(SubmissionStatus.APPROVED_AUTOMATICALLY),
  }),
  BaseCountSchema.extend({
    type: z.literal(SubmissionType.REDUCTION_PROJECT_VERIFICATION),
    status: z.literal(SubmissionStatus.REVIEWED),
  }),
  BaseCountSchema.extend({
    type: z.literal(SubmissionType.REDUCTION_PROJECT_VERIFICATION),
    status: z.literal(SubmissionStatus.REJECTED),
  }),
  // NEUTRALIZATION_PLAN_VERIFICATION
  BaseCountSchema.extend({
    type: z.literal(SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION),
    status: z.literal(SubmissionStatus.PENDING),
  }),
  BaseCountSchema.extend({
    type: z.literal(SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION),
    status: z.literal(SubmissionStatus.APPROVED),
  }),
  BaseCountSchema.extend({
    type: z.literal(SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION),
    status: z.literal(SubmissionStatus.APPROVED_AUTOMATICALLY),
  }),
  BaseCountSchema.extend({
    type: z.literal(SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION),
    status: z.literal(SubmissionStatus.REVIEWED),
  }),
  BaseCountSchema.extend({
    type: z.literal(SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION),
    status: z.literal(SubmissionStatus.REJECTED),
  }),
]);

// All statuses are now included (5 types × 5 statuses = 25 entries)
// APPROVED_AUTOMATICALLY is included to support dashboard display of paired approval counts.
// If a new SubmissionType or SubmissionStatus is added, the RequestKpiCountSchema union entries
// above must be updated to include all new combinations, otherwise runtime validation will fail.
const ALL_STATUSES = Object.keys(SubmissionStatus);
const expectedKpiCount =
  Object.keys(SubmissionType).length * ALL_STATUSES.length;

export const GetAdminRequestsKpisResponseSchema = z.object({
  total: z.number().nonnegative().describe("The total count of requests"),
  counts: z
    .array(RequestKpiCountSchema)
    .length(expectedKpiCount)
    .describe(
      "Breakdown of requests by all possible combinations of type and status"
    )
    .refine(
      (items) => {
        const unique = new Set(items.map((i) => `${i.type}-${i.status}`));
        return unique.size === expectedKpiCount;
      },
      {
        message: `Must include all ${expectedKpiCount} unique combinations of type and status`,
      }
    ),
});
