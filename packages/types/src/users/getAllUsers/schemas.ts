import { z } from "zod";
import { UserBaseSchema } from "../../baseSchemas/index.js";

export const GetAllUsersItemSchema = UserBaseSchema.extend({
  jobPositionName: z.string().nullable(),
});

export const GetAllUsersResponseSchema = z.array(GetAllUsersItemSchema);
