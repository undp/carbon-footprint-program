import { z } from "zod";
import type {
  CreateUserBodySchema,
  CreateUserResponseSchema,
} from "./schemas.ts";

export type CreateUserBody = z.infer<typeof CreateUserBodySchema>;

export type CreateUserResponse = z.infer<typeof CreateUserResponseSchema>;
