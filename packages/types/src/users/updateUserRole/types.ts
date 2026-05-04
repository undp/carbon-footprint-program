import { z } from "zod";
import type {
  UpdateUserRoleBodySchema,
  UpdateUserRoleParamsSchema,
  UpdateUserRoleResponseSchema,
} from "./schemas.ts";

export type UpdateUserRoleParams = z.infer<typeof UpdateUserRoleParamsSchema>;

export type UpdateUserRoleBody = z.infer<typeof UpdateUserRoleBodySchema>;

export type UpdateUserRoleResponse = z.infer<
  typeof UpdateUserRoleResponseSchema
>;
