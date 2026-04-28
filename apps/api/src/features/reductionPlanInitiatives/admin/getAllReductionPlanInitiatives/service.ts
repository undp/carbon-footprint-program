import {
  ReductionPlanInitiativeStatus,
  type Prisma,
  type PrismaClient,
} from "@repo/database";
import type {
  GetAllReductionPlanInitiativesQuery,
  GetAllReductionPlanInitiativesResponse,
} from "@repo/types";
import {
  adminReductionPlanInitiativeInclude,
  mapReductionPlanInitiativeToListItem,
} from "../mappers.js";

export const getAllReductionPlanInitiativesService = async (
  prismaClient: PrismaClient,
  query: GetAllReductionPlanInitiativesQuery | null
): Promise<GetAllReductionPlanInitiativesResponse> => {
  const where: Prisma.ReductionPlanInitiativeWhereInput = {
    status: ReductionPlanInitiativeStatus.ACTIVE,
  };

  if (query?.methodologyVersionId) {
    where.subcategory = {
      category: {
        methodologyVersionId: BigInt(query.methodologyVersionId),
      },
    };
  }

  const rows = await prismaClient.reductionPlanInitiative.findMany({
    where,
    include: adminReductionPlanInitiativeInclude,
    orderBy: [
      { subcategory: { category: { name: "asc" } } },
      { subcategory: { name: "asc" } },
      { title: "asc" },
    ],
  });

  return rows.map(mapReductionPlanInitiativeToListItem);
};
