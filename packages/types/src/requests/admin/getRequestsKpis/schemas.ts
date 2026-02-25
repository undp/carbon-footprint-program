import { SubmissionSubjectType, SubmissionStatus } from "@repo/database/enums";
import { z } from "zod";

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
    type: z.literal(SubmissionSubjectType.ORGANIZATION_ACCREDITATION),
    status: z.literal(SubmissionStatus.PENDING),
  }),
  BaseCountSchema.extend({
    type: z.literal(SubmissionSubjectType.ORGANIZATION_ACCREDITATION),
    status: z.literal(SubmissionStatus.APPROVED),
  }),
  BaseCountSchema.extend({
    type: z.literal(SubmissionSubjectType.ORGANIZATION_ACCREDITATION),
    status: z.literal(SubmissionStatus.REJECTED),
  }),
  // CARBON_INVENTORY_CALCULATION
  BaseCountSchema.extend({
    type: z.literal(SubmissionSubjectType.CARBON_INVENTORY_CALCULATION),
    status: z.literal(SubmissionStatus.PENDING),
  }),
  BaseCountSchema.extend({
    type: z.literal(SubmissionSubjectType.CARBON_INVENTORY_CALCULATION),
    status: z.literal(SubmissionStatus.APPROVED),
  }),
  BaseCountSchema.extend({
    type: z.literal(SubmissionSubjectType.CARBON_INVENTORY_CALCULATION),
    status: z.literal(SubmissionStatus.REJECTED),
  }),
  // CARBON_INVENTORY_VERIFICATION
  BaseCountSchema.extend({
    type: z.literal(SubmissionSubjectType.CARBON_INVENTORY_VERIFICATION),
    status: z.literal(SubmissionStatus.PENDING),
  }),
  BaseCountSchema.extend({
    type: z.literal(SubmissionSubjectType.CARBON_INVENTORY_VERIFICATION),
    status: z.literal(SubmissionStatus.APPROVED),
  }),
  BaseCountSchema.extend({
    type: z.literal(SubmissionSubjectType.CARBON_INVENTORY_VERIFICATION),
    status: z.literal(SubmissionStatus.REJECTED),
  }),
  // REDUCTION_PLAN_VERIFICATION
  BaseCountSchema.extend({
    type: z.literal(SubmissionSubjectType.REDUCTION_PLAN_VERIFICATION),
    status: z.literal(SubmissionStatus.PENDING),
  }),
  BaseCountSchema.extend({
    type: z.literal(SubmissionSubjectType.REDUCTION_PLAN_VERIFICATION),
    status: z.literal(SubmissionStatus.APPROVED),
  }),
  BaseCountSchema.extend({
    type: z.literal(SubmissionSubjectType.REDUCTION_PLAN_VERIFICATION),
    status: z.literal(SubmissionStatus.REJECTED),
  }),
  // NEUTRALIZATION_PLAN_VERIFICATION
  BaseCountSchema.extend({
    type: z.literal(SubmissionSubjectType.NEUTRALIZATION_PLAN_VERIFICATION),
    status: z.literal(SubmissionStatus.PENDING),
  }),
  BaseCountSchema.extend({
    type: z.literal(SubmissionSubjectType.NEUTRALIZATION_PLAN_VERIFICATION),
    status: z.literal(SubmissionStatus.APPROVED),
  }),
  BaseCountSchema.extend({
    type: z.literal(SubmissionSubjectType.NEUTRALIZATION_PLAN_VERIFICATION),
    status: z.literal(SubmissionStatus.REJECTED),
  }),
]);

export const RequestsKpiCountItem = z.object({
  type: z.enum(SubmissionSubjectType).describe("The type of the request"),
  status: z.enum(SubmissionStatus).describe("The status of the request"),
  value: z
    .number()
    .nonnegative()
    .describe("The count of requests for the given type and status"),
});

const expectedKpiCount =
  Object.keys(SubmissionSubjectType).length *
  Object.keys(SubmissionStatus).length;

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
