import { z } from "zod";
import type {
  ToggleOrganizationBlockedParamsSchema,
  ToggleOrganizationBlockedResponseSchema,
} from "./schemas.ts";

export type ToggleOrganizationBlockedParams = z.infer<
  typeof ToggleOrganizationBlockedParamsSchema
>;

export type ToggleOrganizationBlockedResponse = z.infer<
  typeof ToggleOrganizationBlockedResponseSchema
>;
