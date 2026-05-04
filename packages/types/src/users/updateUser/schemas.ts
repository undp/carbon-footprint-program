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
  .strict()
  .refine((data) => Object.keys(data).length >= 1, {
    message: "At least one field must be provided",
  });

export const AdminRoleUpdateSchema = z
  .object({
    role: SystemRoleSchema,
  })
  .strict()
  .refine((data) => Object.keys(data).length >= 1, {
    message: "At least one field must be provided",
  });

export const UpdateUserBodySchema = z.union([
  SelfProfileUpdateSchema,
  AdminRoleUpdateSchema,
]);

export const UpdateUserParamsSchema = UserBaseSchema.pick({
  id: true,
}).strict();

export const UpdateUserResponseSchema = UserBaseSchema;
