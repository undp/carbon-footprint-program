import type { PrismaClient } from "@repo/database";
import {
  CategoryStatus,
  type GetAllCategoriesResponse,
  type GetAllCategoriesQuery,
} from "@repo/types";
import { mapCategoryToResponse } from "../mappers.js";

export const getAllActiveCategoriesService = async (
  prismaClient: PrismaClient,
  query?: GetAllCategoriesQuery
): Promise<GetAllCategoriesResponse> => {
  const methodologyFilter = query?.methodologyVersionId
    ? { methodologyVersionId: BigInt(query.methodologyVersionId) }
    : {};

  const categories = await prismaClient.category.findMany({
    where: {
      ...methodologyFilter,
      status: { not: CategoryStatus.DELETED },
    },
    orderBy: {
      position: "asc",
    },
  });

  return categories.map(mapCategoryToResponse);
};
