import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { OrganizationRole } from "@repo/database/enums";

// Path parameters
export const GetOrganizationUsersParamsSchema = z.object({
  organizationId: IdSchema.describe("The organization ID"),
});

// Organization user schema (for response)
const OrganizationUserSchema = z.object({
  userId: IdSchema.describe("The user ID"),
  name: z.string().describe("The user's full name or email"),
  email: z.email().describe("The user's email address"),
  organizationRole: z
    .enum(OrganizationRole)
    .describe("The user's role in the organization"),
});

// Response schema
export const GetOrganizationUsersResponseSchema = z.object({
  users: z.array(OrganizationUserSchema).describe("List of organization users"),
});
