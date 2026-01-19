import { z } from "zod";
import { UserSchema } from "./base.js";
import { IdSchema } from "../zod.js";

export const DeleteUserParamsSchema = UserSchema.pick({
  id: true,
}).strict();

export const DeleteUserResponseSchema = z.object({
  message: z.string().describe("Confirmation message"),
  id: IdSchema.describe("The ID of the deleted user"),
});

export type DeleteUserParams = z.infer<typeof DeleteUserParamsSchema>;
export type DeleteUserResponse = z.infer<typeof DeleteUserResponseSchema>;
