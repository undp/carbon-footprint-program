import type { PrismaClient } from "@repo/database";
import {
  CategoryStatus,
  type GetAllCategoriesResponse,
  type GetAllCategoriesQuery,
} from "@repo/types";
import { mapCategoryToResponse } from "../mappers.js";

export const getAllCategoriesService = async (
  prismaClient: PrismaClient,
  query?: GetAllCategoriesQuery
): Promise<GetAllCategoriesResponse> => {
  const methodologyVersionId = BigInt(query!.methodologyVersionId);

  const categories = await prismaClient.category.findMany({
    where: {
      methodologyVersionId,
      status: { not: CategoryStatus.DELETED },
    },
    orderBy: {
      position: "asc",
    },
  });

  return categories.map(mapCategoryToResponse);
};
