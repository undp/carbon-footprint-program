import { z } from "zod";
import type {
  GetAllAdminCountryOrganizationSizesQuerySchema,
  GetAllAdminCountryOrganizationSizesResponseSchema,
} from "./schemas.js";

export type GetAllAdminCountryOrganizationSizesQuery = z.infer<
  typeof GetAllAdminCountryOrganizationSizesQuerySchema
>;
export type GetAllAdminCountryOrganizationSizesResponse = z.infer<
  typeof GetAllAdminCountryOrganizationSizesResponseSchema
>;
