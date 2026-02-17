import type { PrismaClient } from "@repo/database";
import {
  CategoryStatus,
  type GetAllCategoriesResponse,
  type GetAllCategoriesQuery,
  User,
} from "@repo/types";
import { mapCategoryToResponse } from "../mappers.js";

export const getAllCategoriesService = async (
  prismaClient: PrismaClient,
  query: GetAllCategoriesQuery | null,
  _user: User | null
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
