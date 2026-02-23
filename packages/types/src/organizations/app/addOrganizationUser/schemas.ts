import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { OrganizationRole } from "@repo/database/enums";

// Path parameters
export const AddOrganizationUserParamsSchema = z.object({
  organizationId: IdSchema.describe("The organization ID"),
});

// Request body
export const AddOrganizationUserBodySchema = z.object({
  email: z.email().describe("Email of the user to add"),
  role: z.enum(OrganizationRole).describe("Role to assign to the user"),
});

// Response schema
export const AddOrganizationUserResponseSchema = z.object({
  membershipId: IdSchema.describe("The created membership ID"),
  userId: IdSchema.describe("The user ID"),
  role: z.enum(OrganizationRole).describe("The assigned role"),
});
