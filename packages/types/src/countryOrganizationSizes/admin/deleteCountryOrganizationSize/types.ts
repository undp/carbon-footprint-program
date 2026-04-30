import { z } from "zod";
import type {
  DeleteCountryOrganizationSizeParamsSchema,
  DeleteCountryOrganizationSizeResponseSchema,
} from "./schemas.js";

export type DeleteCountryOrganizationSizeParams = z.infer<
  typeof DeleteCountryOrganizationSizeParamsSchema
>;
export type DeleteCountryOrganizationSizeResponse = z.infer<
  typeof DeleteCountryOrganizationSizeResponseSchema
>;
