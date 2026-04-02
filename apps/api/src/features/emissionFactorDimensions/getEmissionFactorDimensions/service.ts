import type { Prisma, PrismaClient } from "@repo/database";
import {
  EmissionFactorDimensionStatus,
  EmissionFactorDimensionValueStatus,
  EmissionFactorStatus,
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
  const whereClause: Prisma.SubcategoryWhereInput = {
    ...(query?.methodologyVersionId
      ? {
          category: {
            methodologyVersionId: BigInt(query.methodologyVersionId),
          },
        }
      : {}),
    status: SubcategoryStatus.ACTIVE,
  };

  const subcategories = await prismaClient.subcategory.findMany({
    select: {
      id: true,
      name: true,
      emissionFactors: {
        where: { status: EmissionFactorStatus.ACTIVE },
        select: { id: true },
        take: 1,
      },
      dimensions: {
        where: { status: EmissionFactorDimensionStatus.ACTIVE },
        select: {
          id: true,
          code: true,
          name: true,
          position: true,
          isRequired: true,
          values: {
            where: { status: EmissionFactorDimensionValueStatus.ACTIVE },
            select: {
              id: true,
              value: true,
              emissionFactorsAsDimension1: {
                where: { status: EmissionFactorStatus.ACTIVE },
                select: { id: true },
                take: 1,
              },
              emissionFactorsAsDimension2: {
                where: { status: EmissionFactorStatus.ACTIVE },
                select: { id: true },
                take: 1,
              },
            },
            orderBy: { value: "asc" },
          },
        },
        orderBy: { position: "asc" },
      },
    },
    where: whereClause,
    orderBy: [{ category: { position: "asc" } }, { name: "asc" }],
  });

  return subcategories.map((sub) => ({
    subcategoryId: sub.id.toString(),
    subcategoryName: sub.name,
    subcategoryHasEmissionFactors: sub.emissionFactors.length > 0,
    dimensions: sub.dimensions.map((dim) => ({
      id: dim.id.toString(),
      code: dim.code,
      name: dim.name,
      position: dim.position,
      isRequired: dim.isRequired,
      values: dim.values.map((v) => ({
        id: v.id.toString(),
        value: v.value,
        inUse:
          v.emissionFactorsAsDimension1.length > 0 ||
          v.emissionFactorsAsDimension2.length > 0,
      })),
    })),
  }));
};
