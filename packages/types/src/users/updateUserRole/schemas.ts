import { z } from "zod";
import { SystemRoleSchema, UserBaseSchema } from "../../baseSchemas/index.js";

export const UpdateUserRoleParamsSchema = UserBaseSchema.pick({
  id: true,
}).strict();

export const UpdateUserRoleBodySchema = z
  .object({
    role: SystemRoleSchema,
  })
  .strict()
  .refine((data) => Object.keys(data).length >= 1, {
    message: "At least one field must be provided",
  });

export const UpdateUserRoleResponseSchema = UserBaseSchema;
