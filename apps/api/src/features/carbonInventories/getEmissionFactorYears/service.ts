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

  // `distinct` on the sole selected column: Postgres answers from the index
  // without materialising one row per factor, and the year list is short by
  // nature -- one entry per catalogue edition.
  const factorYears = await prismaClient.emissionFactor.findMany({
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
    distinct: ["year"],
    select: { year: true },
    orderBy: { year: "asc" },
  });

  return factorYears.map((factor) => factor.year);
};
