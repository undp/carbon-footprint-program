import { z } from "zod";
import type {
  UnblockOrganizationParamsSchema,
  UnblockOrganizationResponseSchema,
} from "./schemas.js";

export type UnblockOrganizationParams = z.infer<
  typeof UnblockOrganizationParamsSchema
>;

export type UnblockOrganizationResponse = z.infer<
  typeof UnblockOrganizationResponseSchema
>;
