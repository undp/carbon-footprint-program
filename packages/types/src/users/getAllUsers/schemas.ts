import { z } from "zod";
import { UserBaseSchema } from "../../baseSchemas/index.js";

export const GetAllUsersResponseSchema = z.array(UserBaseSchema);
