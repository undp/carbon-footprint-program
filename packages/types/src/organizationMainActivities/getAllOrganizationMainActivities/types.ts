import { z } from "zod";
import type {
  GetAllOrganizationMainActivitiesQuerySchema,
  GetAllOrganizationMainActivitiesResponseSchema,
} from "./schemas.js";

export type GetAllOrganizationMainActivitiesQuery = z.infer<
  typeof GetAllOrganizationMainActivitiesQuerySchema
>;

export type GetAllOrganizationMainActivitiesResponse = z.infer<
  typeof GetAllOrganizationMainActivitiesResponseSchema
>;
