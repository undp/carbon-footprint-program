import { z } from "zod";
import {
  GetOrganizationRecognitionsParamsSchema,
  GetOrganizationRecognitionsQuerySchema,
  GetOrganizationRecognitionsResponseSchema,
} from "./schemas.js";

export type GetOrganizationRecognitionsParams = z.infer<
  typeof GetOrganizationRecognitionsParamsSchema
>;

export type GetOrganizationRecognitionsQuery = z.infer<
  typeof GetOrganizationRecognitionsQuerySchema
>;

export type GetOrganizationRecognitionsResponse = z.infer<
  typeof GetOrganizationRecognitionsResponseSchema
>;
