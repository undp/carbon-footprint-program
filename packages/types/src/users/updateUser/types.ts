import { z } from "zod";
import type {
  UpdateUserBodySchema,
  UpdateUserParamsSchema,
  UpdateUserResponseSchema,
} from "./schemas.ts";

export type UpdateUserBody = z.infer<typeof UpdateUserBodySchema>;

export type UpdateUserParams = z.infer<typeof UpdateUserParamsSchema>;

export type UpdateUserResponse = z.infer<typeof UpdateUserResponseSchema>;
