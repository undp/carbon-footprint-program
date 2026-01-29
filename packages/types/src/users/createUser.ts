import { z } from "zod";
import { UserSchema } from "./base.js";

export const CreateUserBodySchema = UserSchema.pick({
  email: true,
  countryJobPositionId: true,
  idpUserId: true,
  idpName: true,
  firstName: true,
  lastName: true,
  termsAccepted: true,
  termsAcceptedAt: true,
}).strict();

export const CreateUserResponseSchema = UserSchema;

export type CreateUserBody = z.infer<typeof CreateUserBodySchema>;
export type CreateUserResponse = z.infer<typeof CreateUserResponseSchema>;
