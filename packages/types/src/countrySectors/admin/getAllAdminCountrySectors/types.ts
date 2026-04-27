import { z } from "zod";
import type {
  AdminListStatusFilterSchema,
  GetAllAdminCountrySectorsQuerySchema,
  GetAllAdminCountrySectorsResponseSchema,
} from "./schemas.js";

export type AdminListStatusFilter = z.infer<typeof AdminListStatusFilterSchema>;
export type GetAllAdminCountrySectorsQuery = z.infer<
  typeof GetAllAdminCountrySectorsQuerySchema
>;
export type GetAllAdminCountrySectorsResponse = z.infer<
  typeof GetAllAdminCountrySectorsResponseSchema
>;
