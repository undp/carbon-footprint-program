import { UserSchema } from "../baseSchemas.js";

export const GetUserByIdParamsSchema = UserSchema.pick({
  id: true,
}).strict();

export const GetUserByIdResponseSchema = UserSchema;
