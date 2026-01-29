import { z } from "zod";
import { UserSchema } from "./base.js";

export const UpdateUserBodySchema = UserSchema.pick({
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

export const UpdateUserParamsSchema = UserSchema.pick({
  id: true,
}).strict();

export const UpdateUserResponseSchema = UserSchema;

export type UpdateUserBody = z.infer<typeof UpdateUserBodySchema>;
export type UpdateUserParams = z.infer<typeof UpdateUserParamsSchema>;
export type UpdateUserResponse = z.infer<typeof UpdateUserResponseSchema>;
