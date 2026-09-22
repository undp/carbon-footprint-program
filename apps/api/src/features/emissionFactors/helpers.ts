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
 * A line reference that is still live, whoever the footprint belongs to.
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
 */
const liveLineWhere = {
  status: {
    in: [CarbonInventoryLineStatus.ACTIVE, CarbonInventoryLineStatus.OUTDATED],
  },
} satisfies Prisma.CarbonInventoryLineWhereInput;

/**
 * The references that actually make a factor immutable: live lines under a
 * footprint that somebody can reach.
 *
 * `NOT { organizationId: null, createdById: null }` is the complement of the
 * pair `claimCarbonInventory` matches on, so a footprint starts blocking the
 * moment it has an owner and stops being throwaway traffic.
 *
 * The exclusion exists because the calculator is open: `createCarbonInventory`
 * is a public route that binds the new footprint to the *published* version,
 * and `syncCarbonInventoryLines` is anonymous, so any visitor who picks a
 * subcategory and types a quantity references a catalogue factor. Nobody can
 * then remove that reference — `deleteCarbonInventory` is private, its domain
 * hook grants an org-less footprint only to `createdById`, which is null here,
 * and no write route sets `canAdminsBypass`. Counting those would let anonymous
 * traffic freeze the live catalogue for good, which is the opposite of what
 * this rule is for.
 *
 * Shared with the maintainer listing, deliberately: the grid decides whether to
 * offer an edit from this count and the API decides whether to refuse one. If
 * the two predicates drift, the grid either locks rows the API would accept or
 * offers edits the API will answer with a 409.
 */
export const activeLineReferenceWhere = {
  lineInput: {
    isActive: true,
    line: {
      ...liveLineWhere,
      carbonInventory: {
        status: InventoryStatus.ACTIVE,
        NOT: { organizationId: null, createdById: null },
      },
    },
  },
} satisfies Prisma.CarbonInventoryLineFactorWhereInput;

/**
 * Live references held by footprints nobody has claimed: created through the
 * open calculator and never attached to a user or an organization.
 *
 * These do not block anything. They are counted so the maintainer can be told
 * what an edit or a delete will step on before it happens, rather than being
 * refused by a rule no actor could ever satisfy.
 */
export const unclaimedLineReferenceWhere = {
  lineInput: {
    isActive: true,
    line: {
      ...liveLineWhere,
      carbonInventory: {
        status: InventoryStatus.ACTIVE,
        organizationId: null,
        createdById: null,
      },
    },
  },
} satisfies Prisma.CarbonInventoryLineFactorWhereInput;

/**
 * How many blocking lines depend on this factor. A factor is immutable while
 * any of them does. See `activeLineReferenceWhere` for what counts as one, and
 * `unclaimedLineReferenceWhere` for what deliberately does not.
 *
 * TODO: the softer rule was deferred for claimed footprints. The same count,
 * surfaced as a warning that informs without blocking, is what
 * `add-emission-factor-year` Decision 9 had in mind, and is what unclaimed
 * footprints already get. Extending it means deleting the guards that call this
 * and rendering the count the maintainer already receives — a UI change with no
 * contract change.
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
 * Detaches a factor from the unclaimed footprints still using it, so the delete
 * leaves their lines in a state that reads correctly.
 *
 * Without this the line keeps its frozen snapshot while the source selector
 * stops offering the factor — `getCarbonInventoryMethodology` filters
 * `status: ACTIVE` — so the capture screen shows a blank "Fuente factor" next
 * to a populated "Factor" and a computed total. The line looks half-filled when
 * it is in fact complete and pointing at something that no longer exists.
 * Clearing the snapshot and the computed result instead brings the line back
 * asking for a factor, keeping its subcategory, dimensions, unit and quantity,
 * which is the state the completeness rules already read as unfinished.
 *
 * This is the same reconciliation the `add-emission-factor-year` migration
 * applied when dating the catalogue left footprints holding factors their year
 * would no longer offer. Same situation, different trigger.
 *
 * Scope is exactly `unclaimedLineReferenceWhere`, and it is safe because the
 * guard has already refused the delete if any claimed footprint depends on the
 * factor — so nothing anybody owns is touched. Superseded inputs, deleted lines
 * and deleted footprints keep their snapshots: no reader consults them, and
 * rewriting audit trail to tidy a screen nobody can open is the wrong trade.
 */
export async function detachFactorFromUnclaimedLines(
  tx: Prisma.TransactionClient,
  emissionFactorId: bigint
): Promise<void> {
  const snapshots = await tx.carbonInventoryLineFactor.findMany({
    where: { emissionFactorId, ...unclaimedLineReferenceWhere },
    select: { id: true, lineInputId: true },
  });

  if (snapshots.length === 0) return;

  const lineInputIds = snapshots.map(({ lineInputId }) => lineInputId);

  // Results first: the emissions they hold were computed from the snapshot, so
  // leaving them would report a total the line can no longer explain.
  await tx.carbonInventoryLineResult.deleteMany({
    where: { lineInputId: { in: lineInputIds } },
  });
  await tx.carbonInventoryLineFactor.deleteMany({
    where: { id: { in: snapshots.map(({ id }) => id) } },
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
