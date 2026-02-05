import { UserSchema } from "../baseSchemas.js";

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
