import { z } from "zod";
import { IdSchema } from "../zod.js";

export const SubmissionSubjectBaseSchema = z.object({
  id: IdSchema.describe("The unique identifier for the submission subject"),
  createdAt: z.iso
    .datetime()
    .describe("The date and time when the submission subject was created"),
  createdById: IdSchema.nullable().describe(
    "The ID of the user who created the submission subject"
  ),
});
