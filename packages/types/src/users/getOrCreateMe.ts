import { z } from "zod";
import { UserSchema } from "./base.js";

export const GetOrCreateMeBodySchema = z.object({
  idpUserId: z.string().describe("The ID of the user in the identity provider"),
  email: z.email("Invalid email address").describe("The email of the user"),
}).strict();

export const GetOrCreateMeResponseSchema = UserSchema.nullable();

export type GetOrCreateMeBody = z.infer<typeof GetOrCreateMeBodySchema>;
export type GetOrCreateMeResponse = z.infer<typeof GetOrCreateMeResponseSchema>;
