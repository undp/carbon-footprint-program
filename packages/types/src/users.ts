import { uuid, z } from "zod";
import { IdSchema } from "./zod.js";

export const UserSchema = z.object({
  id: IdSchema.describe("The ID of the user"),
  uuid: uuid().describe("The UUID of the user"),
  email: z.email("Invalid email address").describe("The email of the user"),
  countryJobPositionId: IdSchema.describe("The ID of the country job position"),
  firstName: z.string().nullable().describe("The first name of the user"),
  lastName: z.string().nullable().describe("The last name of the user"),
  createdAt: z.iso.datetime().describe("The creation date of the user"),
  updatedAt: z.iso.datetime().describe("The update date of the user"),
  createdById: IdSchema.nullable().describe(
    "The ID of the user who created this user"
  ),
  updatedById: IdSchema.nullable().describe(
    "The ID of the user who last updated this user"
  ),
});

export const CreateUserBodySchema = z.object({
  email: z.email("Invalid email address").describe("The email of the user"),
  countryJobPositionId: IdSchema.describe("The ID of the country job position"),
  firstName: z.string().min(1).describe("The first name of the user"),
  lastName: z.string().min(1).describe("The last name of the user"),
});

export const GetAllUsersResponseSchema = z.array(UserSchema);

export type User = z.infer<typeof UserSchema>;
export type CreateUserBody = z.infer<typeof CreateUserBodySchema>;
export type CreateUserResponse = z.infer<typeof CreateUserResponseSchema>;
export type GetAllUsersResponse = z.infer<typeof GetAllUsersResponseSchema>;
