import { z } from "zod";
import type {
  DeleteOrganizationMainActivityParamsSchema,
  DeleteOrganizationMainActivityResponseSchema,
} from "./schemas.js";

export type DeleteOrganizationMainActivityParams = z.infer<
  typeof DeleteOrganizationMainActivityParamsSchema
>;
export type DeleteOrganizationMainActivityResponse = z.infer<
  typeof DeleteOrganizationMainActivityResponseSchema
>;
