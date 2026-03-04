import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { SubmissionStatus, SubmissionSubjectType } from "@repo/database/enums";

const AdminRequestSchema = z.object({
  id: IdSchema.describe("The ID of the request"),
  organizationName: z.string().min(1).describe("The name of the organization"),
  type: z.enum(SubmissionSubjectType).describe("The type of the request"),
  year: z.number().int().nullable().describe("The year of the request"),
  status: z.enum(SubmissionStatus).describe("The status of the request"),
  requestedAt: z.iso.datetime().describe("The date the request was made"),
});

export const GetAllAdminRequestsResponseSchema = z.array(AdminRequestSchema);
