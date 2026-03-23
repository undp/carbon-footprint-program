import { z } from "zod";
import type {
  GetAllOrganizationBranchesQuerySchema,
  GetAllOrganizationBranchesResponseSchema,
} from "./schemas.js";

export type GetAllOrganizationBranchesQuery = z.infer<
  typeof GetAllOrganizationBranchesQuerySchema
>;

export type GetAllOrganizationBranchesResponse = z.infer<
  typeof GetAllOrganizationBranchesResponseSchema
>;
