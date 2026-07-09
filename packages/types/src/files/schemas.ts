import { z } from "zod";
import { SubmissionFileType } from "@repo/database/enums";
import { HttpUploadMethodSchema } from "./httpMethod.js";

export const SubmissionFileTypeSchema = z.enum(SubmissionFileType);

export const SignedUrlResponseSchema = z.object({
  url: z.url().describe("Temporary signed URL"),
  expiresAt: z.iso.datetime().describe("When the URL expires"),
});

/** Response shared by every request-upload endpoint: a presigned write URL plus the protocol the client must follow. */
export const PresignedUploadResponseSchema = z.object({
  uuid: z.uuid().describe("The generated file UUID"),
  uploadUrl: z.url().describe("Temporary signed URL for uploading the file"),
  uploadMethod: HttpUploadMethodSchema.describe(
    "HTTP method the client must use to upload the file"
  ),
  uploadHeaders: z
    .record(z.string(), z.string())
    .describe("HTTP headers the client must send when uploading the file"),
  expiresAt: z.iso.datetime().describe("When the upload URL expires"),
});
