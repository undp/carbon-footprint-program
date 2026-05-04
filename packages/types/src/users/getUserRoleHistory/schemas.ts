import { z } from "zod";
import { UserBaseSchema } from "../../baseSchemas/user.js";
import { UserRoleAuditBaseSchema } from "../../baseSchemas/userRoleAudit.js";

export const GetUserRoleHistoryParamsSchema = UserBaseSchema.pick({
  id: true,
}).strict();

export const GetUserRoleHistoryResponseSchema = z.array(
  UserRoleAuditBaseSchema
);
