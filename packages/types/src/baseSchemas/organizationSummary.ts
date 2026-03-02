import { z } from "zod";
import { IdSchema } from "../zod.js";
import { SubmissionStatusSchema } from "./submission.js";

export const OrganizationSummaryBaseSchema = z.object({
  organizationId: IdSchema.describe(
    "The unique identifier for the organization."
  ),
  organizationDataId: IdSchema.describe(
    "The unique identifier for the organization data."
  ),
  name: z.string().describe("The name of the organization."),
  lastSubmissionStatus: SubmissionStatusSchema.nullable().describe(
    "The status of the last submission."
  ),
  hasUnsubmittedChanges: z
    .boolean()
    .describe("Indicates if there are unsubmitted changes."),
  displayStatus: z.string().describe("The display status of the organization."),
  isAccredited: z
    .boolean()
    .describe("Indicates if the organization is accredited."),
  hasCarbonInventories: z
    .boolean()
    .describe("Indicates if the organization has carbon inventories."),
  totalEmissions: z
    .string()
    .describe("The total emissions of the organization."),
  lastMeasurement: z.iso
    .datetime()
    .nullable()
    .describe("The date and time of the last measurement."),
});
