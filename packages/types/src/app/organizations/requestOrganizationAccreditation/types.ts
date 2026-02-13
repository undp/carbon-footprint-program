import { z } from "zod";
import type {
  RequestOrganizationAccreditationParamsSchema,
  RequestOrganizationAccreditationResponseSchema,
} from "./schemas.js";

export type RequestOrganizationAccreditationParams = z.infer<
  typeof RequestOrganizationAccreditationParamsSchema
>;

export type RequestOrganizationAccreditationResponse = z.infer<
  typeof RequestOrganizationAccreditationResponseSchema
>;
