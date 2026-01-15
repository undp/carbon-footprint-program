import { z } from "zod";
import { UserSchema } from "./base.js";

export const DeleteUserParamsSchema = UserSchema.pick({
  id: true,
}).strict();

export const DeleteUserResponseSchema = z.object({
  message: z.string().describe("Confirmation message"),
});

export type DeleteUserParams = z.infer<typeof DeleteUserParamsSchema>;
export type DeleteUserResponse = z.infer<typeof DeleteUserResponseSchema>;
