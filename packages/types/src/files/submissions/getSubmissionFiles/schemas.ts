import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { SubmissionFileTypeSchema } from "../../schemas.js";
import {
  FileBaseSchema,
  FileStatusSchema,
} from "../../../baseSchemas/index.js";

export const GetSubmissionFilesParamsSchema = z.object({
  submissionId: IdSchema.describe("The submission ID"),
});

export const GetSubmissionFilesQuerySchema = z.object({
  status: FileStatusSchema.optional().describe("Filter files by status"),
  submissionFileType: SubmissionFileTypeSchema.optional().describe(
    "Filter by submission file type"
  ),
});

export const GetSubmissionFilesResponseSchema = z.array(FileBaseSchema);
