import { z } from "zod";
import type {
  UpdateOrganizationMainActivityParamsSchema,
  UpdateOrganizationMainActivityRequestSchema,
  UpdateOrganizationMainActivityResponseSchema,
} from "./schemas.js";

export type UpdateOrganizationMainActivityParams = z.infer<
  typeof UpdateOrganizationMainActivityParamsSchema
>;
export type UpdateOrganizationMainActivityRequest = z.infer<
  typeof UpdateOrganizationMainActivityRequestSchema
>;
export type UpdateOrganizationMainActivityResponse = z.infer<
  typeof UpdateOrganizationMainActivityResponseSchema
>;
