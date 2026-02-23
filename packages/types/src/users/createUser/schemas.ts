import { UserSchema } from "../baseSchemas.js";

export const CreateUserBodySchema = UserSchema.pick({
  email: true,
  countryJobPositionId: true,
  idpUserId: true,
  idpName: true,
  firstName: true,
  lastName: true,
}).strict();

export const CreateUserResponseSchema = UserSchema;
