import {
  ReductionPlanInitiativeStatus,
  type PrismaClient,
} from "@repo/database";
import type { GetAllInitiativesResponse } from "@repo/types";
import { adminInitiativeInclude, mapInitiativeToListItem } from "../mappers.js";

export const getAllInitiativesService = async (
  prismaClient: PrismaClient
): Promise<GetAllInitiativesResponse> => {
  const rows = await prismaClient.reductionPlanInitiative.findMany({
    where: { status: ReductionPlanInitiativeStatus.ACTIVE },
    include: adminInitiativeInclude,
    orderBy: [
      { subcategory: { category: { name: "asc" } } },
      { subcategory: { name: "asc" } },
      { title: "asc" },
    ],
  });

  return rows.map(mapInitiativeToListItem);
};
