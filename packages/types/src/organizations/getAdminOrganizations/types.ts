import { z } from "zod";
import type {
  GetAdminOrganizationsQuerySchema,
  GetAdminOrganizationsResponseSchema,
} from "./schemas.ts";

export type GetAdminOrganizationsQuery = z.infer<
  typeof GetAdminOrganizationsQuerySchema
>;

export type GetAdminOrganizationsResponse = z.infer<
  typeof GetAdminOrganizationsResponseSchema
>;
