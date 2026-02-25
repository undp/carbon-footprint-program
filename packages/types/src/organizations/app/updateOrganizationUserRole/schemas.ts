import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { OrganizationRole } from "@repo/database/enums";

// Path parameters
export const UpdateOrganizationUserRoleParamsSchema = z.object({
  organizationId: IdSchema.describe("The organization ID"),
  organizationUserId: IdSchema.describe("The user ID"),
});

// Request body
export const UpdateOrganizationUserRoleBodySchema = z.object({
  role: z.enum(OrganizationRole).describe("The new role to assign to the user"),
});

// Response schema
export const UpdateOrganizationUserRoleResponseSchema = z.object({
  membershipId: IdSchema.describe("The updated membership ID"),
  role: z.enum(OrganizationRole).describe("The updated role"),
});
