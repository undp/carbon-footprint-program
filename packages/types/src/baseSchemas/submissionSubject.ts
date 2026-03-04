import { z } from "zod";
import { IdSchema } from "../zod.js";
import { SubmissionSubjectType } from "../enums.js";

export const SubmissionSubjectTypeSchema = z.enum(SubmissionSubjectType);

export const SubmissionSubjectBaseSchema = z.object({
  id: IdSchema.describe("The unique identifier for the submission subject"),
  subjectType: SubmissionSubjectTypeSchema.describe(
    "The type of the submission subject"
  ),
  createdAt: z.iso
    .datetime()
    .describe("The date and time when the submission subject was created"),
  createdById: IdSchema.nullable().describe(
    "The ID of the user who created the submission subject"
  ),
});
