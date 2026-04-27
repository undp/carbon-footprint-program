import { z } from "zod";
import type {
  CreateOrganizationMainActivityRequestSchema,
  CreateOrganizationMainActivityResponseSchema,
} from "./schemas.js";

export type CreateOrganizationMainActivityRequest = z.infer<
  typeof CreateOrganizationMainActivityRequestSchema
>;
export type CreateOrganizationMainActivityResponse = z.infer<
  typeof CreateOrganizationMainActivityResponseSchema
>;
