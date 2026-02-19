import { z } from "zod";
import {
  CreateOrganizationBodySchema,
  CreateOrganizationResponseSchema,
} from "./schemas.js";

export type CreateOrganizationBody = z.infer<
  typeof CreateOrganizationBodySchema
>;

export type CreateOrganizationResponse = z.infer<
  typeof CreateOrganizationResponseSchema
>;
