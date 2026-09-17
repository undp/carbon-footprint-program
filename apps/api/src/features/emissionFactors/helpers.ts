import type { Prisma } from "@repo/database";
import {
  CarbonInventoryLineStatus,
  EmissionFactorDimensionStatus,
  EmissionFactorDimensionValueStatus,
  EmissionFactorStatus,
  InventoryStatus,
} from "@repo/types";
import { EMISSION_FACTOR_GAS_DETAILS_TOLERANCE } from "@/config/constants.js";
import {
  DimensionNotConfiguredError,
  DimensionValueNotFoundError,
  EmissionFactorDuplicateError,
  EmissionFactorSourceConflictError,
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

/**
 * Checks that no other ACTIVE emission factor exists with the same
 * uniqueness key for the given subcategory and year.
 *
 * The uniqueness key is always subcategoryId and year, plus each dimension
 * value whose dimension is marked as required for that subcategory. Optional
 * dimensions are not part of the key — multiple factors may coexist with
 * different (or null) optional dimension values. `source` is not part of it
 * either, which makes this check stricter than the database index and the one
 * that actually blocks.
 *
 * The year is in the key so a catalogue loaded for a new year can restate the
 * same subcategory and dimensions without colliding with the previous year's.
 */
export async function checkDuplicateEmissionFactor(
  tx: Prisma.TransactionClient,
  subcategoryId: bigint,
  dimensionValue1Id: bigint | null,
  dimensionValue2Id: bigint | null,
  year: number,
  excludeId?: bigint
): Promise<void> {
  const requiredDimensions = await tx.emissionFactorDimension.findMany({
    where: {
      subcategoryId,
      isRequired: true,
      status: EmissionFactorDimensionStatus.ACTIVE,
    },
    select: { position: true },
  });

  const requiredPositions = new Set(requiredDimensions.map((d) => d.position));

  const where: Prisma.EmissionFactorWhereInput = {
    subcategoryId,
    year,
    status: EmissionFactorStatus.ACTIVE,
    ...(excludeId != null ? { id: { not: excludeId } } : {}),
  };

  if (requiredPositions.has(1)) {
    where.dimensionValue1Id = dimensionValue1Id ?? null;
  }
  if (requiredPositions.has(2)) {
    where.dimensionValue2Id = dimensionValue2Id ?? null;
  }

  const duplicate = await tx.emissionFactor.findFirst({
    where,
    select: { id: true },
  });

  if (duplicate) {
    throw new EmissionFactorDuplicateError();
  }
}

/**
 * Enforces that all active emission factors for a subcategory and year share
 * the same source, so a catalogue loaded for a new year can carry its own
 * citation without conflicting with the previous year's.
 *
 * TODO: more than one source per (subcategory, year) was deliberately deferred.
 * It is a product decision, not a compliance requirement — neither the GHG
 * Protocol nor ISO forbids several sources, but the capture dropdown would then
 * present real options and a non-expert user would be making an undocumented
 * methodological choice. Lifting it means deleting this function and adding
 * `source` to the key in `checkDuplicateEmissionFactor`: validation only, no
 * migration and no data change.
 */
export async function validateSourceConsistency(
  tx: Prisma.TransactionClient,
  subcategoryId: bigint,
  source: string,
  year: number,
  excludeId?: bigint
): Promise<void> {
  const existingSource = await tx.emissionFactor.findFirst({
    where: {
      subcategoryId,
      year,
      status: EmissionFactorStatus.ACTIVE,
      ...(excludeId != null ? { id: { not: excludeId } } : {}),
    },
    select: { source: true },
  });

  if (existingSource && existingSource.source !== source) {
    throw new EmissionFactorSourceConflictError(existingSource.source);
  }
}

/**
 * The line references that make an emission factor immutable.
 *
 * The predicate is the dependency itself rather than the status of the
 * methodology version the factor hangs off: `PUBLISHED` is a poor proxy for it
 * in both directions — a version published yesterday has no dependents, and the
 * version unpublished when it was superseded keeps all of its.
 *
 * `isActive` on the input: line inputs are versioned, one active per line, and
 * every reader in the application filters on that, so a reference surviving in
 * a superseded input is audit trail nothing consults. Counting it would freeze
 * a factor permanently on the strength of a row no code reads.
 *
 * `ACTIVE` or `OUTDATED` on the line, never `DELETED`. A parked (OUTDATED) line
 * keeps its snapshot and is reactivated by `toggleManualTotalEmissions` without
 * passing through `syncCarbonInventoryLines`, so it still depends on the
 * factor; excluding it would let an edited factor return to a live footprint
 * through the back door. A DELETED line is the opposite case: deleting a line
 * is a soft delete that leaves the active input and its snapshot in place, and
 * no code path anywhere returns a line to `ACTIVE`, so counting it would lock
 * the factor forever against a line nobody can see, restore or point at.
 *
 * `ACTIVE` on the footprint, for the same reason one level up: deleting a
 * footprint only sets its own status, leaving every line, input and snapshot
 * below it untouched.
 *
 * Shared with the maintainer listing's `_count`, deliberately: the grid decides
 * whether to offer an edit from the count, and the API decides whether to
 * refuse one. If the two predicates drift, the grid either locks rows the API
 * would accept or offers edits the API will answer with a 409.
 */
export const activeLineReferenceWhere = {
  lineInput: {
    isActive: true,
    line: {
      status: {
        in: [
          CarbonInventoryLineStatus.ACTIVE,
          CarbonInventoryLineStatus.OUTDATED,
        ],
      },
      carbonInventory: { status: InventoryStatus.ACTIVE },
    },
  },
} satisfies Prisma.CarbonInventoryLineFactorWhereInput;

/**
 * How many live lines depend on this factor. A factor is immutable while any of
 * them does. See `activeLineReferenceWhere` for what counts as one.
 *
 * TODO: the softer rule was deferred. The same count, surfaced as a warning
 * that informs without blocking, is what `add-emission-factor-year` Decision 9
 * had in mind. Lifting the block to a warning means deleting the guards that
 * call this and rendering the count the maintainer already receives — a UI
 * change with no contract change.
 */
export async function countActiveLineReferences(
  tx: Prisma.TransactionClient,
  emissionFactorId: bigint
): Promise<number> {
  return tx.carbonInventoryLineFactor.count({
    where: { emissionFactorId, ...activeLineReferenceWhere },
  });
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
