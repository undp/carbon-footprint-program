import { z } from "zod";
import type {
  UpdateCountryOrganizationSizeParamsSchema,
  UpdateCountryOrganizationSizeRequestSchema,
  UpdateCountryOrganizationSizeResponseSchema,
} from "./schemas.js";

export type UpdateCountryOrganizationSizeParams = z.infer<
  typeof UpdateCountryOrganizationSizeParamsSchema
>;
export type UpdateCountryOrganizationSizeRequest = z.infer<
  typeof UpdateCountryOrganizationSizeRequestSchema
>;
export type UpdateCountryOrganizationSizeResponse = z.infer<
  typeof UpdateCountryOrganizationSizeResponseSchema
>;
