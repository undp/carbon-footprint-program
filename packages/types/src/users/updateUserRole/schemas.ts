import { z } from "zod";
import { SystemRoleSchema, UserBaseSchema } from "../../baseSchemas/index.js";

export const UpdateUserRoleParamsSchema = UserBaseSchema.pick({
  id: true,
}).strict();

export const UpdateUserRoleBodySchema = z
  .object({
    role: SystemRoleSchema,
  })
  .strict();

export const UpdateUserRoleResponseSchema = UserBaseSchema;
