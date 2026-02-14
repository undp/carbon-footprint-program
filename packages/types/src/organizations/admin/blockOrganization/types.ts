import { z } from "zod";
import type {
  BlockOrganizationParamsSchema,
  BlockOrganizationResponseSchema,
} from "./schemas.js";

export type BlockOrganizationParams = z.infer<
  typeof BlockOrganizationParamsSchema
>;

export type BlockOrganizationResponse = z.infer<
  typeof BlockOrganizationResponseSchema
>;
