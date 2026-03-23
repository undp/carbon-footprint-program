import type {
  GetAllOrganizationBranchesResponse,
  GetAllOrganizationBranchesQuery,
} from "@repo/types";
import { createGetAllHandler } from "@/handlerFactory/index.js";
import { getAllOrganizationBranchesService } from "./service.js";

export const getAllOrganizationBranchesHandler = createGetAllHandler<
  GetAllOrganizationBranchesResponse,
  GetAllOrganizationBranchesQuery
>(
  "organizationBranches",
  getAllOrganizationBranchesService,
  "Organization branches",
  false
);
