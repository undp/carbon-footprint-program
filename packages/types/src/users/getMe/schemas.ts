import { UserBaseSchema } from "../../baseSchemas/index.js";

export const GetMeBodySchema = UserBaseSchema.pick({
  idpUserId: true,
}).strict();

export const GetMeResponseSchema = UserBaseSchema.nullable();
