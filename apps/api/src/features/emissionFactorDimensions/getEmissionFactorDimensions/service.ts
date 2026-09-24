import type { Prisma, PrismaClient } from "@repo/database";
import {
  EmissionFactorDimensionStatus,
  EmissionFactorDimensionValueStatus,
  EmissionFactorStatus,
  ReductionPlanInitiativeStatus,
  SubcategoryStatus,
  User,
  type GetEmissionFactorDimensionsQuery,
  type GetEmissionFactorDimensionsResponse,
} from "@repo/types";
import { LIVE_CAPTURE_WHERE } from "../helpers.js";

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
              // A value is also pinned by what users captured with it and by
              // the reduction initiatives built on it. Removing it cascades
              // only over emission factors, so leaving these out would let a
              // maintainer retire a value that active captures still point at
              // — exactly what the maintainer help forbids.
              lineInputsAsSelection1: {
                where: LIVE_CAPTURE_WHERE,
                select: { id: true },
                take: 1,
              },
              lineInputsAsSelection2: {
                where: LIVE_CAPTURE_WHERE,
                select: { id: true },
                take: 1,
              },
              reductionPlanInitiativesAsDimension1: {
                where: { status: ReductionPlanInitiativeStatus.ACTIVE },
                select: { id: true },
                take: 1,
              },
              reductionPlanInitiativesAsDimension2: {
                where: { status: ReductionPlanInitiativeStatus.ACTIVE },
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
    // Same tie as getAllSubcategories: the category status is not filtered, and
    // category positions are unique only among non-DELETED rows, so `id` is
    // what keeps two categories sharing a position from interleaving.
    orderBy: [
      { category: { position: "asc" } },
      { category: { id: "asc" } },
      { position: "asc" },
    ],
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
          v.emissionFactorsAsDimension2.length > 0 ||
          v.lineInputsAsSelection1.length > 0 ||
          v.lineInputsAsSelection2.length > 0 ||
          v.reductionPlanInitiativesAsDimension1.length > 0 ||
          v.reductionPlanInitiativesAsDimension2.length > 0,
      })),
    })),
  }));
};
