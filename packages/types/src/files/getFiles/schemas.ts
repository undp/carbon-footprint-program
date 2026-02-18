import { z } from "zod";
import {
  FileSchema,
  FileStatusSchema,
  SubmissionFileTypeSchema,
} from "../baseSchemas.js";

export const GetFilesQuerySchema = z.object({
  status: FileStatusSchema.optional().describe("Filter files by status"),
  submissionFileType: SubmissionFileTypeSchema.optional().describe(
    "Filter by submission file type"
  ),
});

export const GetFilesResponseSchema = z.array(FileSchema);
