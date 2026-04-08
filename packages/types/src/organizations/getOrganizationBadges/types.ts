import { z } from "zod";
import {
  GetOrganizationBadgesParamsSchema,
  GetOrganizationBadgesQuerySchema,
  GetOrganizationBadgesResponseSchema,
} from "./schemas.js";

export type GetOrganizationBadgesParams = z.infer<
  typeof GetOrganizationBadgesParamsSchema
>;

export type GetOrganizationBadgesQuery = z.infer<
  typeof GetOrganizationBadgesQuerySchema
>;

export type GetOrganizationBadgesResponse = z.infer<
  typeof GetOrganizationBadgesResponseSchema
>;
