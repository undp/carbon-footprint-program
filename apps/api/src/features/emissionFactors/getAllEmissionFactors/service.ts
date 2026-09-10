import type { Prisma, PrismaClient } from "@repo/database";
import {
  EmissionFactorDimensionStatus,
  EmissionFactorDimensionValueStatus,
  EmissionFactorStatus,
  User,
  type GetAllEmissionFactorsQuery,
  type GetAllEmissionFactorsResponse,
} from "@repo/types";
import { parseGasDetails } from "../mappers.js";

export const getAllEmissionFactorsService = async (
  prismaClient: PrismaClient,
  query: GetAllEmissionFactorsQuery | null,
  _user: User | null
): Promise<GetAllEmissionFactorsResponse> => {
  const whereClause: Prisma.EmissionFactorWhereInput = {
    ...(query?.methodologyVersionId
      ? {
          subcategory: {
            category: {
              methodologyVersionId: BigInt(query.methodologyVersionId),
            },
          },
        }
      : {}),
    status: EmissionFactorStatus.ACTIVE,
    AND: [
      {
        OR: [
          { dimensionValue1Id: null },
          {
            dimensionValue1: {
              is: {
                status: EmissionFactorDimensionValueStatus.ACTIVE,
                dimension: {
                  is: { status: EmissionFactorDimensionStatus.ACTIVE },
                },
              },
            },
          },
        ],
      },
      {
        OR: [
          { dimensionValue2Id: null },
          {
            dimensionValue2: {
              is: {
                status: EmissionFactorDimensionValueStatus.ACTIVE,
                dimension: {
                  is: { status: EmissionFactorDimensionStatus.ACTIVE },
                },
              },
            },
          },
        ],
      },
    ],
  };

  const emissionFactors = await prismaClient.emissionFactor.findMany({
    include: {
      subcategory: {
        select: { id: true, name: true },
      },
      dimensionValue1: {
        select: { id: true, value: true },
      },
      dimensionValue2: {
        select: { id: true, value: true },
      },
      rateMeasurementUnit: {
        select: { id: true, name: true },
      },
    },
    where: whereClause,
    // `id` closes both ties the position keys leave open: a DELETED subcategory
    // can share a position with an active one (the unique index is partial),
    // and every factor of the same subcategory ties on all of the keys above.
    // Without a total order Postgres returns heap order, so editing one factor
    // moves its tuple and reshuffles the grid on the next refetch.
    orderBy: [
      { subcategory: { category: { position: "asc" } } },
      { subcategory: { position: "asc" } },
      { subcategory: { id: "asc" } },
      { id: "asc" },
    ],
  });

  return emissionFactors.map((ef) => ({
    id: ef.id.toString(),
    value: ef.value.toString(),
    source: ef.source,
    subcategoryId: ef.subcategory.id.toString(),
    subcategoryName: ef.subcategory.name,
    dimensionValue1Id: ef.dimensionValue1?.id.toString() ?? null,
    dimensionValue1Name: ef.dimensionValue1?.value ?? null,
    dimensionValue2Id: ef.dimensionValue2?.id.toString() ?? null,
    dimensionValue2Name: ef.dimensionValue2?.value ?? null,
    rateMeasurementUnitId: ef.rateMeasurementUnit.id.toString(),
    rateMeasurementUnitName: ef.rateMeasurementUnit.name,
    gasDetails: parseGasDetails(ef.gasDetails, ef.id),
  }));
};
