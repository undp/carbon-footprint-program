import { z } from "zod";
import { UserSchema } from "./base.js";

export const CreateUserBodySchema = UserSchema.pick({
  email: true,
  countryJobPositionId: true,
})
  .extend({
    firstName: z.string().min(1).describe("The first name of the user"),
    lastName: z.string().min(1).describe("The last name of the user"),
  })
  .strict();

export const CreateUserResponseSchema = UserSchema;

export type CreateUserBody = z.infer<typeof CreateUserBodySchema>;
export type CreateUserResponse = z.infer<typeof CreateUserResponseSchema>;
