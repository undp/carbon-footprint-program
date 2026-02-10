import { z } from "zod";
import {
  ToggleOrganizationBlockedParamsSchema,
  ToggleOrganizationBlockedResponseSchema,
} from "./schemas.js";

export type ToggleOrganizationBlockedParams = z.infer<
  typeof ToggleOrganizationBlockedParamsSchema
>;

export type ToggleOrganizationBlockedResponse = z.infer<
  typeof ToggleOrganizationBlockedResponseSchema
>;
