import { z } from "zod";
import type {
  DeleteUserParamsSchema,
  DeleteUserResponseSchema,
} from "./schemas.ts";

export type DeleteUserParams = z.infer<typeof DeleteUserParamsSchema>;

export type DeleteUserResponse = z.infer<typeof DeleteUserResponseSchema>;
