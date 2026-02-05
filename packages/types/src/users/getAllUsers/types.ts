import { z } from "zod";
import type { GetAllUsersResponseSchema } from "./schemas.ts";

export type GetAllUsersResponse = z.infer<typeof GetAllUsersResponseSchema>;
