import type { PrismaClient } from "@repo/database";
import {
  CategoryStatus,
  SubcategoryStatus,
  type GetEmissionFactorYearsResponse,
} from "@repo/types";
import {
  CarbonInventoryNotFoundError,
  MethodologyNotFoundError,
} from "../errors.js";
import { offerableEmissionFactorWhere } from "../helpers.js";

/**
 * The footprint years this inventory's methodology has factors for.
 *
 * The year selector used to build its options from the current date, which
 * offered years no catalogue covers: every subcategory then came back with an
 * empty factor list and the capture screen blamed the subcategory instead of
 * the year. The options are read from the catalogue instead, so a year is
 * offered exactly when picking it leaves something to capture with.
 *
 * Scoped to this footprint's methodology version, not to the catalogue at
 * large: the version a footprint is pinned to never changes, so years that
 * only exist in another methodology would strand the user just as badly, one
 * step later.
 *
 * An empty array is a legitimate answer — a methodology whose factors are all
 * deleted has no year worth offering — and the caller decides what to say
 * about it.
 */
export const getEmissionFactorYearsService = async (
  prismaClient: PrismaClient,
  carbonInventoryId: string
): Promise<GetEmissionFactorYearsResponse> => {
  const carbonInventory = await prismaClient.carbonInventory.findUnique({
    where: { id: BigInt(carbonInventoryId) },
    select: { methodologyVersionId: true },
  });

  if (!carbonInventory) {
    throw new CarbonInventoryNotFoundError(carbonInventoryId);
  }

  if (!carbonInventory.methodologyVersionId) {
    throw new MethodologyNotFoundError(carbonInventoryId);
  }

  // `groupBy` rather than `findMany` + `distinct`: Prisma applies `distinct` on
  // the client, so the year list would be folded out of one row per active
  // factor of the methodology -- a few hundred today, and one more set per
  // catalogue edition. The grouping is what the answer is (one entry per
  // edition), so it belongs in the database.
  const factorYears = await prismaClient.emissionFactor.groupBy({
    where: {
      ...offerableEmissionFactorWhere,
      subcategory: {
        status: SubcategoryStatus.ACTIVE,
        category: {
          status: CategoryStatus.ACTIVE,
          methodologyVersionId: carbonInventory.methodologyVersionId,
        },
      },
    },
    by: ["year"],
    orderBy: { year: "asc" },
  });

  return factorYears.map((factor) => factor.year);
};
