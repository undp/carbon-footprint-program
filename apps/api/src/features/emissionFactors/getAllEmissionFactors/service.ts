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
import { activeLineReferenceWhere } from "../helpers.js";

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

  // How many live lines depend on each factor, so the maintainer can leave a
  // factor in use inert instead of offering an edit the API will refuse. The
  // predicate is shared with the guard rather than restated, because the grid
  // and the API have to agree on it — see `activeLineReferenceWhere`.
  //
  // A separate `groupBy` scoped to the factors on screen, not a filtered
  // relation count folded into the query above. Prisma compiles that form into
  // an uncorrelated `GROUP BY emission_factor_id` derived table with no
  // predicate on that column, so it aggregates the whole junction table however
  // few factors the version has — and that table is the one thing here whose
  // size follows end-user traffic rather than catalogue size, because line
  // inputs are versioned and nothing prunes it. Scoping it by id costs one
  // round trip on a listing that already takes five, and it is the query the
  // index on `carbon_inventory_line_factor(emission_factor_id)` serves.
  const referenceCounts = await prismaClient.carbonInventoryLineFactor.groupBy({
    by: ["emissionFactorId"],
    where: {
      emissionFactorId: { in: emissionFactors.map(({ id }) => id) },
      ...activeLineReferenceWhere,
    },
    _count: { _all: true },
  });

  const referencedLineCountById = new Map(
    referenceCounts.map(({ emissionFactorId, _count }) => [
      emissionFactorId?.toString(),
      _count._all,
    ])
  );

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
    referencedLineCount: referencedLineCountById.get(ef.id.toString()) ?? 0,
  }));
};
