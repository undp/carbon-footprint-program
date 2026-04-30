import { z } from "zod";
import type {
  RestoreOrganizationMainActivityParamsSchema,
  RestoreOrganizationMainActivityResponseSchema,
} from "./schemas.js";

export type RestoreOrganizationMainActivityParams = z.infer<
  typeof RestoreOrganizationMainActivityParamsSchema
>;
export type RestoreOrganizationMainActivityResponse = z.infer<
  typeof RestoreOrganizationMainActivityResponseSchema
>;
