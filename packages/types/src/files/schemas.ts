import { z } from "zod";
import { SubmissionFileType } from "@repo/database/enums";

export const FileTypeSchema = z.enum(["SUBMISSION", "BADGE"]);

export const SubmissionFileTypeSchema = z.enum(SubmissionFileType);

export const SignedUrlResponseSchema = z.object({
  url: z.url().describe("Temporary signed URL"),
  expiresAt: z.iso.datetime().describe("When the URL expires"),
});
