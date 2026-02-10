import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { OrganizationStatus } from "../../../enums.js";

export const ToggleOrganizationBlockedParamsSchema = z
  .object({
    id: IdSchema.describe("The ID of the organization"),
  })
  .strict();

export const ToggleOrganizationBlockedResponseSchema = z.object({
  id: IdSchema.describe("The ID of the organization"),
  status: z.enum(OrganizationStatus).describe("The new status"),
  previousStatus: z.enum(OrganizationStatus).describe("The previous status"),
});
