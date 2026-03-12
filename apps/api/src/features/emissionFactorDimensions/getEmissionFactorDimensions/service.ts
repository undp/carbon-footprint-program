import type { PrismaClient } from "@repo/database";
import {
  SubcategoryStatus,
  User,
  type GetEmissionFactorDimensionsQuery,
  type GetEmissionFactorDimensionsResponse,
} from "@repo/types";

export const getEmissionFactorDimensionsService = async (
  prismaClient: PrismaClient,
  query: GetEmissionFactorDimensionsQuery | null,
  _user: User | null
): Promise<GetEmissionFactorDimensionsResponse> => {
  const subcategories = await prismaClient.subcategory.findMany({
    where: {
      ...(query?.methodologyVersionId
        ? {
            category: {
              methodologyVersionId: BigInt(query.methodologyVersionId),
            },
          }
        : {}),
      status: { not: SubcategoryStatus.DELETED },
    },
    select: {
      id: true,
      name: true,
      dimensions: {
        select: {
          id: true,
          code: true,
          name: true,
          position: true,
          isRequired: true,
        },
        orderBy: { position: "asc" },
      },
    },
    orderBy: [{ category: { position: "asc" } }, { name: "asc" }],
  });

  return subcategories.map((sub) => ({
    subcategoryId: sub.id.toString(),
    subcategoryName: sub.name,
    dimensions: sub.dimensions.map((dim) => ({
      id: dim.id.toString(),
      code: dim.code,
      name: dim.name,
      position: dim.position,
      isRequired: dim.isRequired,
    })),
  }));
};
