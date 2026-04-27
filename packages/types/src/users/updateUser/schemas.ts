import { z } from "zod";
import { UserBaseSchema, SystemRoleSchema } from "../../baseSchemas/index.js";

export const SelfProfileUpdateSchema = UserBaseSchema.pick({
  email: true,
  countryJobPositionId: true,
  firstName: true,
  lastName: true,
  idpUserId: true,
  idpName: true,
  termsAccepted: true,
})
  .partial()
  .strict();

export const AdminRoleUpdateSchema = z
  .object({
    role: SystemRoleSchema,
  })
  .strict();

export const UpdateUserBodySchema = z.union([
  SelfProfileUpdateSchema,
  AdminRoleUpdateSchema,
]);

export const UpdateUserParamsSchema = UserBaseSchema.pick({
  id: true,
}).strict();

export const UpdateUserResponseSchema = UserBaseSchema;
