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
 * Normalizes a factor's dimension slots **for identity purposes only**: a value
 * parked in a slot the subcategory does not require is not part of the key, so
 * it must not be able to split one identity into two.
 *
 * The normalized values are not what gets persisted. A value the maintainer put
 * in an optional slot is real data and stays on the row; it just does not earn
 * the factor a separate identity. That does mean this check is stricter than the
 * database index, which compares the raw columns — the same asymmetry the
 * catalog has always had, and safe in that direction: the application rejects a
 * little more than the constraint would, never less.
 */
async function normalizeEmissionFactorIdentity(
  tx: Prisma.TransactionClient,
  identity: EmissionFactorIdentity
): Promise<EmissionFactorIdentity> {
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
    ...identity,
    dimensionValue1Id: requiredPositions.has(1)
      ? identity.dimensionValue1Id
      : null,
    dimensionValue2Id: requiredPositions.has(2)
      ? identity.dimensionValue2Id
      : null,
  };
}

/**
 * Checks that no other ACTIVE emission factor already occupies this factor's
 * identity:
 *
 *   (subcategory, required dimension values, year, source,
 *    numerator magnitude, denominator magnitude)
 *
 * Two points are easy to get wrong. `year = null` is a real value meaning
 * "transversal", so it has to be matched explicitly rather than skipped — which
 * is why every field is compared with an explicit null. And the key uses the
 * unit *family*, not the exact unit: `kg/kg` and `kg/ton` are both mass/mass and
 * so are one factor expressed two ways, while `kg/kWh` and `kg/m3` are different
 * families that may coexist for the same activity, source and year.
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
  const normalized = await normalizeEmissionFactorIdentity(tx, identity);

  const duplicate = await tx.emissionFactor.findFirst({
    where: {
      subcategoryId: normalized.subcategoryId,
      dimensionValue1Id: normalized.dimensionValue1Id,
      dimensionValue2Id: normalized.dimensionValue2Id,
      year: normalized.year,
      source: normalized.source,
      numeratorMagnitudeId: normalized.numeratorMagnitudeId,
      denominatorMagnitudeId: normalized.denominatorMagnitudeId,
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
