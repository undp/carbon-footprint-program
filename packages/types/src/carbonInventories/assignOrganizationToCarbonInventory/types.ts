import { z } from "zod";
import type {
  AssignOrganizationToCarbonInventoryParamsSchema,
  AssignOrganizationToCarbonInventoryResponseSchema,
} from "./schemas.js";

export type AssignOrganizationToCarbonInventoryParams = z.infer<
  typeof AssignOrganizationToCarbonInventoryParamsSchema
>;

export type AssignOrganizationToCarbonInventoryResponse = z.infer<
  typeof AssignOrganizationToCarbonInventoryResponseSchema
>;
