import { UserBaseSchema } from "../../baseSchemas/index.js";

export const GetUserByIdParamsSchema = UserBaseSchema.pick({
  id: true,
}).strict();

export const GetUserByIdResponseSchema = UserBaseSchema;
