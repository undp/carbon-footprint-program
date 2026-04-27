import { z } from "zod";
import type {
  GetUserRoleHistoryParamsSchema,
  GetUserRoleHistoryResponseSchema,
} from "./schemas.ts";

export type GetUserRoleHistoryParams = z.infer<typeof GetUserRoleHistoryParamsSchema>;
export type GetUserRoleHistoryResponse = z.infer<typeof GetUserRoleHistoryResponseSchema>;
