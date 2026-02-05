import { z } from "zod";
import { UserSchema } from "../baseSchemas.js";

export const GetMeBodySchema = z
  .object({
    idpUserId: z
      .string()
      .describe("The ID of the user in the identity provider"),
  })
  .strict();

export const GetMeResponseSchema = UserSchema.nullable();
