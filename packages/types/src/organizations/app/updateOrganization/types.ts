import { z } from "zod";
import {
  UpdateOrganizationParamsSchema,
  UpdateOrganizationBodySchema,
  UpdateOrganizationResponseSchema,
} from "./schemas.js";

export type UpdateOrganizationParams = z.infer<
  typeof UpdateOrganizationParamsSchema
>;

export type UpdateOrganizationBody = z.infer<
  typeof UpdateOrganizationBodySchema
>;

export type UpdateOrganizationResponse = z.infer<
  typeof UpdateOrganizationResponseSchema
>;
