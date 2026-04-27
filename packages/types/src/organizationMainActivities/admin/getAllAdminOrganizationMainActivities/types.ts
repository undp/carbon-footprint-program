import { z } from "zod";
import type {
  GetAllAdminOrganizationMainActivitiesQuerySchema,
  GetAllAdminOrganizationMainActivitiesResponseSchema,
} from "./schemas.js";

export type GetAllAdminOrganizationMainActivitiesQuery = z.infer<
  typeof GetAllAdminOrganizationMainActivitiesQuerySchema
>;
export type GetAllAdminOrganizationMainActivitiesResponse = z.infer<
  typeof GetAllAdminOrganizationMainActivitiesResponseSchema
>;
