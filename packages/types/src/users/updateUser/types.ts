import { z } from "zod";
import type {
  UpdateUserBodySchema,
  UpdateUserParamsSchema,
  UpdateUserResponseSchema,
  SelfProfileUpdateSchema,
  AdminRoleUpdateSchema,
} from "./schemas.ts";

export type UpdateUserBody = z.infer<typeof UpdateUserBodySchema>;
export type SelfProfileUpdate = z.infer<typeof SelfProfileUpdateSchema>;
export type AdminRoleUpdate = z.infer<typeof AdminRoleUpdateSchema>;

export type UpdateUserParams = z.infer<typeof UpdateUserParamsSchema>;

export type UpdateUserResponse = z.infer<typeof UpdateUserResponseSchema>;
