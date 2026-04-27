import { z } from "zod";
import type {
  CreateCountryOrganizationSizeRequestSchema,
  CreateCountryOrganizationSizeResponseSchema,
} from "./schemas.js";

export type CreateCountryOrganizationSizeRequest = z.infer<
  typeof CreateCountryOrganizationSizeRequestSchema
>;
export type CreateCountryOrganizationSizeResponse = z.infer<
  typeof CreateCountryOrganizationSizeResponseSchema
>;
