import { z } from "zod";
import { UserSchema } from "../baseSchemas.js";

export const GetAllUsersResponseSchema = z.array(UserSchema);
