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
      // How many active lines depend on each factor, so the maintainer can
      // leave a factor in use inert instead of offering an edit the API will
      // refuse. Filtered on the input's `isActive` for the reason given on
      // `countActiveLineReferences`: a reference surviving only in a superseded
      // input is audit trail nothing reads. It stays one round trip — a
      // filtered relation count, not a query per row — and it is what the index
      // on `carbon_inventory_line_factor(emission_factor_id)` exists for.
      _count: {
        select: {
          lineFactors: { where: { lineInput: { isActive: true } } },
        },
      },
    },
    where: whereClause,
    // `id` closes all three ties the position keys leave open: a DELETED
    // category and a DELETED subcategory can each share a position with an
    // active one (both unique indexes are partial, and neither status is
    // filtered here), and every factor of the same subcategory ties on all of
    // the keys above. The category key matters most: without it the
    // subcategories of two categories sharing a position interleave, so the
    // grid shows two categories woven together. Without a total order Postgres
    // returns heap order, so editing one factor moves its tuple and reshuffles
    // the grid on the next refetch.
    orderBy: [
      { subcategory: { category: { position: "asc" } } },
      { subcategory: { category: { id: "asc" } } },
      { subcategory: { position: "asc" } },
      { subcategory: { id: "asc" } },
      { id: "asc" },
    ],
  });

  return emissionFactors.map((ef) => ({
    id: ef.id.toString(),
    value: ef.value.toString(),
    source: ef.source,
    year: ef.year,
    subcategoryId: ef.subcategory.id.toString(),
    subcategoryName: ef.subcategory.name,
    dimensionValue1Id: ef.dimensionValue1?.id.toString() ?? null,
    dimensionValue1Name: ef.dimensionValue1?.value ?? null,
    dimensionValue2Id: ef.dimensionValue2?.id.toString() ?? null,
    dimensionValue2Name: ef.dimensionValue2?.value ?? null,
    rateMeasurementUnitId: ef.rateMeasurementUnit.id.toString(),
    rateMeasurementUnitName: ef.rateMeasurementUnit.name,
    gasDetails: parseGasDetails(ef.gasDetails, ef.id),
    referencedLineCount: ef._count.lineFactors,
  }));
};
