import { z } from "zod";
import {
  GetOrganizationHistoryParamsSchema,
  GetOrganizationHistoryResponseSchema,
} from "./schemas.js";

export type GetOrganizationHistoryParams = z.infer<
  typeof GetOrganizationHistoryParamsSchema
>;

export type GetOrganizationHistoryResponse = z.infer<
  typeof GetOrganizationHistoryResponseSchema
>;
