import { z } from "zod";
import {
  RequestOrganizationAccreditationBodySchema,
  RequestOrganizationAccreditationParamsSchema,
  RequestOrganizationAccreditationResponseSchema,
} from "./schemas.js";

export type RequestOrganizationAccreditationParams = z.infer<
  typeof RequestOrganizationAccreditationParamsSchema
>;

export type RequestOrganizationAccreditationBody = z.infer<
  typeof RequestOrganizationAccreditationBodySchema
>;

export type RequestOrganizationAccreditationResponse = z.infer<
  typeof RequestOrganizationAccreditationResponseSchema
>;
