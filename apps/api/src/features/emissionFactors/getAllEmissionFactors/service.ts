import type { PrismaClient } from "@repo/database";
import {
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
  const emissionFactors = await prismaClient.emissionFactor.findMany({
    where: {
      ...(query?.methodologyVersionId
        ? {
            subcategory: {
              category: {
                methodologyVersionId: BigInt(query.methodologyVersionId),
              },
            },
          }
        : {}),
      status: { not: EmissionFactorStatus.DELETED },
    },
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
    orderBy: [
      { subcategory: { category: { position: "asc" } } },
      { subcategory: { name: "asc" } },
    ],
  });

  return emissionFactors.map((ef) => ({
    id: ef.id.toString(),
    value: ef.value.toNumber(),
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
