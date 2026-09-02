import type { Prisma } from "@repo/database";
import {
  EmissionFactorDimensionStatus,
  EmissionFactorDimensionValueStatus,
  EmissionFactorStatus,
} from "@repo/types";
import { EMISSION_FACTOR_GAS_DETAILS_TOLERANCE } from "@/config/constants.js";
import {
  DimensionNotConfiguredError,
  DimensionValueNotFoundError,
  EmissionFactorDuplicateError,
  EmissionFactorGasDetailsMismatchError,
  SubcategoryChangeMissingDimensionsError,
} from "./errors.js";

/**
 * Looks up an existing dimension value by name for a given subcategory and position.
 * Throws if the dimension or value does not exist.
 */
export async function findDimensionValue(
  tx: Prisma.TransactionClient,
  subcategoryId: bigint,
  position: number,
  valueName: string
): Promise<bigint> {
  const dimension = await tx.emissionFactorDimension.findFirst({
    where: {
      subcategoryId,
      position,
      status: EmissionFactorDimensionStatus.ACTIVE,
    },
    select: { id: true },
  });

  if (!dimension) {
    throw new DimensionNotConfiguredError(position.toString());
  }

  const value = await tx.emissionFactorDimensionValue.findFirst({
    where: {
      dimensionId: dimension.id,
      value: valueName,
      status: EmissionFactorDimensionValueStatus.ACTIVE,
    },
    select: { id: true },
  });

  if (!value) {
    throw new DimensionValueNotFoundError(valueName, position.toString());
  }

  return value.id;
}

export type EmissionFactorIdentity = {
  subcategoryId: bigint;
  dimensionValue1Id: bigint | null;
  dimensionValue2Id: bigint | null;
  year: number | null;
  source: string;
  numeratorMagnitudeId: bigint;
  denominatorMagnitudeId: bigint;
};

/**
 * The dimension part of the duplicate lookup.
 *
 * A slot the subcategory does not require is not part of a factor's identity, so
 * it is left **out of the query entirely** rather than pinned to null. Those are
 * not the same thing: pinning it to null asks for rows whose slot is *also*
 * empty, which silently misses an existing factor that has a value parked there
 * and lets a duplicate through — the database index compares the raw columns and
 * does not catch it either.
 *
 * Omitting the slot keeps the intended asymmetry: the application rejects a
 * little more than the constraint would, never less. A value the maintainer put
 * in an optional slot stays on the row; it just does not earn the factor a
 * separate identity.
 */
async function buildDimensionIdentityFilter(
  tx: Prisma.TransactionClient,
  identity: EmissionFactorIdentity
): Promise<Prisma.EmissionFactorWhereInput> {
  const requiredDimensions = await tx.emissionFactorDimension.findMany({
    where: {
      subcategoryId: identity.subcategoryId,
      isRequired: true,
      status: EmissionFactorDimensionStatus.ACTIVE,
    },
    select: { position: true },
  });

  const requiredPositions = new Set(requiredDimensions.map((d) => d.position));

  return {
    ...(requiredPositions.has(1)
      ? { dimensionValue1Id: identity.dimensionValue1Id }
      : {}),
    ...(requiredPositions.has(2)
      ? { dimensionValue2Id: identity.dimensionValue2Id }
      : {}),
  };
}

/**
 * Checks that no other ACTIVE emission factor already occupies this factor's
 * identity:
 *
 *   (subcategory, required dimension values, year, source,
 *    numerator magnitude, denominator magnitude)
 *
 * Three points are easy to get wrong. `year = null` is a real value meaning
 * "transversal", so it is matched with an explicit null rather than skipped. An
 * optional dimension slot is the opposite case: it is not part of the identity,
 * so it is omitted from the query rather than matched against null — see
 * `buildDimensionIdentityFilter`. And the key uses the unit *family*, not the
 * exact unit: `kg/kg` and `kg/ton` are both mass/mass and so are one factor
 * expressed two ways, while `kg/kWh` and `kg/m3` are different families that may
 * coexist for the same activity, source and year.
 *
 * The same key is enforced by the partial unique index
 * `emission_factor_unique_subcategory_dims_year_source_family`; this check exists
 * to return a meaningful error instead of a raw P2002.
 */
export async function checkDuplicateEmissionFactor(
  tx: Prisma.TransactionClient,
  identity: EmissionFactorIdentity,
  excludeId?: bigint
): Promise<void> {
  const dimensionFilter = await buildDimensionIdentityFilter(tx, identity);

  const duplicate = await tx.emissionFactor.findFirst({
    where: {
      subcategoryId: identity.subcategoryId,
      ...dimensionFilter,
      year: identity.year,
      source: identity.source,
      numeratorMagnitudeId: identity.numeratorMagnitudeId,
      denominatorMagnitudeId: identity.denominatorMagnitudeId,
      status: EmissionFactorStatus.ACTIVE,
      ...(excludeId != null ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });

  if (duplicate) {
    throw new EmissionFactorDuplicateError();
  }
}

/**
 * Validates that the gas details breakdown sums to the declared value.
 * Skips validation when the breakdown sums to zero.
 */
export function validateGasDetailsSum(
  gasDetails: Record<string, number>,
  declaredValue: number
): void {
  const gasSum = Object.values(gasDetails).reduce((sum, v) => sum + v, 0);
  if (
    gasSum > 0 &&
    Math.abs(gasSum - declaredValue) > EMISSION_FACTOR_GAS_DETAILS_TOLERANCE
  ) {
    throw new EmissionFactorGasDetailsMismatchError(
      gasSum.toFixed(4),
      declaredValue.toFixed(4)
    );
  }
}

/**
 * When changing subcategory, dimension values from the old subcategory are
 * invalid — requires the caller to explicitly provide them for the new one.
 */
export function validateSubcategoryChangeDimensions(
  newSubcategoryId: string | undefined,
  existingSubcategoryId: bigint,
  dimensionValue1Name: string | null | undefined,
  dimensionValue2Name: string | null | undefined
): void {
  if (
    newSubcategoryId !== undefined &&
    BigInt(newSubcategoryId) !== existingSubcategoryId &&
    (dimensionValue1Name === undefined || dimensionValue2Name === undefined)
  ) {
    throw new SubcategoryChangeMissingDimensionsError();
  }
}
