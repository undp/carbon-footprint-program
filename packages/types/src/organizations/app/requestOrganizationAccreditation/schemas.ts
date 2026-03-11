import { z } from "zod";
import { IdSchema } from "../../../zod.js";

export const RequestOrganizationAccreditationParamsSchema = z.object({
  id: IdSchema.describe("The organization ID to request accreditation for"),
});

export const RequestOrganizationAccreditationBodySchema = z
  .object({
    fileUuids: z
      .array(z.uuid())
      .optional()
      .describe("UUIDs of pre-uploaded files to attach"),
  })
  .nullish();

export const RequestOrganizationAccreditationResponseSchema = z.object({
  submissionId: IdSchema.describe("The created submission ID"),
});
