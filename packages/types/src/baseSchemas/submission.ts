import { z } from "zod";
import { IdSchema } from "../zod.js";
import { SubmissionStatus } from "../enums.js";

export const SubmissionStatusSchema = z.enum(SubmissionStatus);

export const SubmissionBaseSchema = z.object({
  id: IdSchema.describe("The unique identifier for the submission"),
  subjectId: IdSchema.describe(
    "The ID of the subject associated with the submission"
  ),
  status: SubmissionStatusSchema.describe("The status of the submission"),
  reviewerId: IdSchema.nullable().describe(
    "The ID of the reviewer for the submission"
  ),
  reviewComments: z
    .string()
    .nullable()
    .describe("The review comments for the submission"),
  createdAt: z.iso
    .datetime()
    .describe("The date and time when the submission was created"),
  updatedAt: z.iso
    .datetime()
    .nullable()
    .describe("The date and time when the submission was last updated"),
  createdById: IdSchema.nullable().describe(
    "The ID of the user who created the submission"
  ),
  updatedById: IdSchema.nullable().describe(
    "The ID of the user who last updated the submission"
  ),
});
