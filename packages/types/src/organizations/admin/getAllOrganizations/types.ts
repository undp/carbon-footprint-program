import { z } from "zod";
import {
  GetAllOrganizationsQuerySchema,
  GetAllOrganizationsResponseSchema,
} from "./schemas.js";

export type GetAllOrganizationsQuery = z.infer<
  typeof GetAllOrganizationsQuerySchema
>;

export type GetAllOrganizationsResponse = z.infer<
  typeof GetAllOrganizationsResponseSchema
>;
