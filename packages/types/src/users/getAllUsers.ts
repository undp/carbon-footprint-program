import { z } from "zod";
import { UserSchema } from "./base.js";

export const GetAllUsersResponseSchema = z.array(UserSchema);

export type GetAllUsersResponse = z.infer<typeof GetAllUsersResponseSchema>;
