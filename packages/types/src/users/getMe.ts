import { z } from "zod";
import { UserSchema } from "./base.js";

export const GetMeBodySchema = z
  .object({
    idpUserId: z
      .string()
      .describe("The ID of the user in the identity provider"),
  })
  .strict();

export const GetMeResponseSchema = UserSchema.nullable();

export type GetMeBody = z.infer<typeof GetMeBodySchema>;
export type GetMeResponse = z.infer<typeof GetMeResponseSchema>;
