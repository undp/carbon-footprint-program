import type { PrismaClient } from "@repo/database";
import {
  SubCategoryStatus,
  type GetAllSubcategoriesResponse,
  type GetAllSubcategoriesQuery,
  User,
} from "@repo/types";
import { mapSubcategoryToResponse } from "../mappers.js";

export const getAllSubcategoriesService = async (
  prismaClient: PrismaClient,
  query: GetAllSubcategoriesQuery | null,
  _user: User | null
): Promise<GetAllSubcategoriesResponse> => {
  const subcategories = await prismaClient.subcategory.findMany({
    where: {
      ...(query?.methodologyVersionId
        ? {
            category: {
              methodologyVersionId: BigInt(query.methodologyVersionId),
            },
          }
        : {}),
      status: { not: SubCategoryStatus.DELETED },
    },
    include: {
      category: {
        select: { methodologyVersionId: true },
      },
      subcategoryMeasurementUnits: {
        select: { measurementUnitId: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return subcategories.map((sub) =>
    mapSubcategoryToResponse(
      sub,
      sub.subcategoryMeasurementUnits.map((smu) => smu.measurementUnitId)
    )
  );
};
