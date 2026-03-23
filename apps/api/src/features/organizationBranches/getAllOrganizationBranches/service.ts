import type { PrismaClient } from "@repo/database";
import type {
  GetAllOrganizationBranchesQuery,
  GetAllOrganizationBranchesResponse,
} from "@repo/types";
import type { User } from "@repo/types";
import { mapOrganizationBranchToResponse } from "../mappers.js";

export const getAllOrganizationBranchesService = async (
  prismaClient: PrismaClient,
  query: GetAllOrganizationBranchesQuery | null,
  _user: User | null
): Promise<GetAllOrganizationBranchesResponse> => {
  const branches = await prismaClient.organizationBranch.findMany({
    where: {
      organizationId: query?.organizationId
        ? BigInt(query.organizationId)
        : undefined,
    },
    orderBy: { name: "asc" },
  });

  return branches.map(mapOrganizationBranchToResponse);
};
