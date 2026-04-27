import { z } from "zod";
import type {
  GetAllAdminCountrySectorsQuerySchema,
  GetAllAdminCountrySectorsResponseSchema,
} from "./schemas.js";

export type GetAllAdminCountrySectorsQuery = z.infer<
  typeof GetAllAdminCountrySectorsQuerySchema
>;
export type GetAllAdminCountrySectorsResponse = z.infer<
  typeof GetAllAdminCountrySectorsResponseSchema
>;
