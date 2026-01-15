import { z } from "zod";
import { UserSchema } from "./base.js";

export const GetUserByIdParamsSchema = UserSchema.pick({
  id: true,
}).strict();

export const GetUserByIdResponseSchema = UserSchema;

export type GetUserByIdParams = z.infer<typeof GetUserByIdParamsSchema>;
export type GetUserByIdResponse = z.infer<typeof GetUserByIdResponseSchema>;
