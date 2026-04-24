import {
  ReductionPlanInitiativeStatus,
  type PrismaClient,
} from "@repo/database";
import type { GetAllReductionPlanInitiativesResponse } from "@repo/types";
import {
  adminReductionPlanInitiativeInclude,
  mapReductionPlanInitiativeToListItem,
} from "../mappers.js";

export const getAllReductionPlanInitiativesService = async (
  prismaClient: PrismaClient
): Promise<GetAllReductionPlanInitiativesResponse> => {
  const rows = await prismaClient.reductionPlanInitiative.findMany({
    where: { status: ReductionPlanInitiativeStatus.ACTIVE },
    include: adminReductionPlanInitiativeInclude,
    orderBy: [
      { subcategory: { category: { name: "asc" } } },
      { subcategory: { name: "asc" } },
      { title: "asc" },
    ],
  });

  return rows.map(mapReductionPlanInitiativeToListItem);
};
