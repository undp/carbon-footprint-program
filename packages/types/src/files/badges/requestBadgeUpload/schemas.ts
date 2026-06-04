import { z } from "zod";
import { BadgeTypeSchema } from "../../../baseSchemas/index.js";
import { HttpUploadMethodSchema } from "../../httpMethod.js";

export const RequestBadgeUploadParamsSchema = z.object({
  badgeType: BadgeTypeSchema.describe("The badge type"),
});

export const RequestBadgeUploadBodySchema = z.object({
  originalName: z
    .string()
    .min(1)
    .max(255)
    .trim()
    .regex(/^[ -~]+$/, "File name must only contain printable ASCII characters")
    .refine(
      (name) => !/[/\\:]/.test(name),
      "File name must not contain path separators or colons"
    )
    .describe("The original file name"),
});

export const RequestBadgeUploadResponseSchema = z.object({
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
