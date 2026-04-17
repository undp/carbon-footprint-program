import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { SubmissionStatus, SubmissionType } from "@repo/database/enums";

const AdminRequestSchema = z.object({
  id: IdSchema.describe("The ID of the request"),
  organizationId: IdSchema.describe("The ID of the organization"),
  organizationName: z.string().min(1).describe("The name of the organization"),
  carbonInventoryId: IdSchema.nullable().describe(
    "The ID of the carbon inventory"
  ),
  reductionProjectId: IdSchema.nullable().describe(
    "The ID of the reduction project"
  ),
  type: z.enum(SubmissionType).describe("The type of the request"),
  year: z.number().int().nullable().describe("The year of the request"),
  status: z.enum(SubmissionStatus).describe("The status of the request"),
  requestedAt: z.iso.datetime().describe("The date the request was made"),
});

export const GetAllAdminRequestsResponseSchema = z.array(AdminRequestSchema);
