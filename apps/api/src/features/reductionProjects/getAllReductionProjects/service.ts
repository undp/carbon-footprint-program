import type { PrismaClient } from "@repo/database";
import type {
  GetAllReductionProjectsQuery,
  GetAllReductionProjectsResponse,
  User,
} from "@repo/types";
import { mapReductionProjectSummary } from "../mappers.js";

export const getAllReductionProjectsService = async (
  prismaClient: PrismaClient,
  query: GetAllReductionProjectsQuery | null,
  _user: User | null
): Promise<GetAllReductionProjectsResponse> => {
  const projects = await prismaClient.reductionProject.findMany({
    where: {
      organizationId: query?.organizationId
        ? BigInt(query.organizationId)
        : undefined,
      organizationBranchId: query?.branchId
        ? BigInt(query.branchId)
        : undefined,
      status: query?.status ?? undefined,
    },
    include: {
      reports: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return projects.map(mapReductionProjectSummary);
};
