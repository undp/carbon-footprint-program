import { z } from "zod";
import { IdSchema } from "../zod.js";
import { SubmissionStatusSchema } from "./submission.js";

export const OrganizationSummaryBaseSchema = z.object({
  organizationId: IdSchema,
  organizationDataId: IdSchema,
  name: z.string(),
  lastSubmissionStatus: SubmissionStatusSchema.nullable(),
  hasUnsubmittedChanges: z.boolean(),
  displayStatus: z.string(),
  isAccredited: z.boolean(),
  hasCarbonInventories: z.boolean(),
  totalEmissions: z.string(),
  lastMeasurement: z.iso.datetime().nullable(),
});
