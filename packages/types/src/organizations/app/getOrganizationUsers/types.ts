import { z } from "zod";
import {
  GetOrganizationUsersParamsSchema,
  GetOrganizationUsersResponseSchema,
} from "./schemas.js";

export type GetOrganizationUsersParams = z.infer<
  typeof GetOrganizationUsersParamsSchema
>;

export type GetOrganizationUsersResponse = z.infer<
  typeof GetOrganizationUsersResponseSchema
>;
