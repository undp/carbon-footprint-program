import { z } from "zod";
import {
  UpdateOrganizationParamsSchema,
  UpdateOrganizationRequestSchema,
  UpdateOrganizationResponseSchema,
} from "./schemas.js";

export type UpdateOrganizationParams = z.infer<
  typeof UpdateOrganizationParamsSchema
>;
export type UpdateOrganizationRequest = z.infer<
  typeof UpdateOrganizationRequestSchema
>;
export type UpdateOrganizationResponse = z.infer<
  typeof UpdateOrganizationResponseSchema
>;
