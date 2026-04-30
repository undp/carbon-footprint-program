import { z } from "zod";
import type {
  GetAllAdminCountrySubsectorsQuerySchema,
  GetAllAdminCountrySubsectorsResponseSchema,
} from "./schemas.js";

export type GetAllAdminCountrySubsectorsQuery = z.infer<
  typeof GetAllAdminCountrySubsectorsQuerySchema
>;
export type GetAllAdminCountrySubsectorsResponse = z.infer<
  typeof GetAllAdminCountrySubsectorsResponseSchema
>;
