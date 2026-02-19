import { z } from "zod";

export const RequestsKpiCountItem = z.object({
  type: z
    .enum([
      "ORGANIZATION_ACREDITATION",
      "CARBON_INVENTORY_CALCULATION",
      "CARBON_INVENTORY_VERIFICATION",
      "REDUCTION_PLAN_VERFICATION",
      "NEUTRALIZATION_PLAN_VERFICATION",
    ])
    .describe("The type of the request"),
  status: z
    .enum(["PENDING", "APPROVED", "REJECTED"])
    .describe("The status of the request"),
  value: z
    .number()
    .nonnegative()
    .describe("The count of requests for the given type and status"),
});

export const GetAdminRequestsKpisResponseSchema = z.object({
  total: z.number().nonnegative().describe("The total count of requests"),
  counts: z
    .array(RequestsKpiCountItem)
    .describe(
      "An array of counts for each combination of request type and status"
    ),
});
