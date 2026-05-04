import { z } from "zod";
import type {
  GetAllUsersResponseSchema,
  GetAllUsersItemSchema,
} from "./schemas.ts";

export type GetAllUsersItem = z.infer<typeof GetAllUsersItemSchema>;
export type GetAllUsersResponse = z.infer<typeof GetAllUsersResponseSchema>;
