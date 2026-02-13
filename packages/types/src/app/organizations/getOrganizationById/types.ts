import { z } from "zod";
import type {
  GetOrganizationByIdParamsSchema,
  GetOrganizationByIdResponseSchema,
} from "./schemas.js";

export type GetOrganizationByIdParams = z.infer<
  typeof GetOrganizationByIdParamsSchema
>;

export type GetOrganizationByIdResponse = z.infer<
  typeof GetOrganizationByIdResponseSchema
>;
