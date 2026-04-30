import { z } from "zod";
import type {
  RestoreCountryOrganizationSizeParamsSchema,
  RestoreCountryOrganizationSizeResponseSchema,
} from "./schemas.js";

export type RestoreCountryOrganizationSizeParams = z.infer<
  typeof RestoreCountryOrganizationSizeParamsSchema
>;
export type RestoreCountryOrganizationSizeResponse = z.infer<
  typeof RestoreCountryOrganizationSizeResponseSchema
>;
