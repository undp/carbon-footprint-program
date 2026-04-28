import { z } from "zod";
import { OrganizationRole } from "@repo/database/enums";
import { UserBaseSchema } from "../../baseSchemas/index.js";

export const UserOrganizationMembershipItemSchema = z.object({
  organizationId: z.string(),
  organizationName: z.string(),
  role: z.enum(OrganizationRole),
});

export const GetAllUsersItemSchema = UserBaseSchema.extend({
  jobPositionName: z.string().nullable(),
  organizations: z.array(UserOrganizationMembershipItemSchema),
});

export const GetAllUsersResponseSchema = z.array(GetAllUsersItemSchema);
