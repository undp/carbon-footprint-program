import { z } from "zod";
import type {
  OrganizationKpiCountSchema,
  GetOrganizationKpisResponseSchema,
} from "./schemas.js";

export type OrganizationKpiCount = z.infer<typeof OrganizationKpiCountSchema>;

export type GetOrganizationKpisResponse = z.infer<
  typeof GetOrganizationKpisResponseSchema
>;
