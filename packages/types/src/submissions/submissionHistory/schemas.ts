import { z } from "zod";
import { FileBaseSchema } from "../../baseSchemas/file.js";
import { CommonOrganizationFieldsSchema } from "../../organizations/schemas.js";
import {
  SubmissionEventType,
  SubmissionStatusSchema,
  SubmissionTypeSchema,
} from "../../baseSchemas/submission.js";
import { IdSchema } from "../../zod.js";

export const SubmissionEventTypeSchema = z.enum([
  SubmissionEventType.POSTULATION,
  SubmissionEventType.SELF_DECLARATION,
  SubmissionEventType.ON_REVIEW,
  SubmissionEventType.APPROVED,
  SubmissionEventType.APPROVED_AUTOMATICALLY,
  SubmissionEventType.REJECTED,
  SubmissionEventType.OBJECTED,
]);

export const SubmissionFileWithUrlSchema = FileBaseSchema.omit({
  deletedAt: true,
  status: true,
}).extend({
  previewUrl: z.string().describe("Signed URL to open the file"),
  previewUrlExpiresAt: z.iso
    .datetime()
    .describe("Expiry time of the signed URL"),
});

export const SubmissionHistoryEntrySchema = z.object({
  submissionId: IdSchema.nullable().describe(
    "The ID of the submission, or null for self-declarations"
  ),
  submissionType: SubmissionTypeSchema.nullable().describe(
    "The SubmissionType enum value, or null for self-declarations"
  ),
  eventType: SubmissionEventTypeSchema.describe(
    "Derived event type from submission status"
  ),
  status: SubmissionStatusSchema.nullable().describe(
    "The raw submission status for admin actions, or null for self-declarations"
  ),
  date: z.iso.datetime().describe("The date of the event"),
  userName: z.string().nullable().describe("Name of the user who created it"),
  userMetadata: z
    .string()
    .nullable()
    .describe("Additional user context, e.g. organization name"),
  carbonInventoryId: IdSchema.nullable().describe(
    "The ID of the carbon inventory, or null for self-declarations"
  ),
  organizationId: IdSchema.nullable().describe(
    "The ID of the organization, or null for self-declarations"
  ),
  organizationData: CommonOrganizationFieldsSchema.nullable().describe(
    "Organization data for accreditation submissions"
  ),
  comment: z.string().describe("Review comments or empty string"),
  files: z
    .array(SubmissionFileWithUrlSchema)
    .describe("Attachment files with signed URLs"),
  recognitions: z
    .array(SubmissionFileWithUrlSchema)
    .describe("Recognition/certificate files with signed URLs"),
});

export const GetSubmissionHistoryResponseSchema = z.array(
  SubmissionHistoryEntrySchema
);
