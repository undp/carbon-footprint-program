import type { Prisma } from "@repo/database";
import {
  CarbonInventoryLineStatus,
  EmissionFactorStatus,
  InventoryStatus,
  ReductionPlanInitiativeStatus,
} from "@repo/types";

/**
 * A capture that still pins the dimension value it selected. `isActive` alone
 * is not enough: deleting a line or a whole inventory only flips their own
 * status and leaves the input active. OUTDATED lines do count — they are the
 * lines hidden while manual total emissions are on, and they come back when
 * that is turned off.
 */
export const LIVE_CAPTURE_WHERE = {
  isActive: true,
  line: {
    status: { not: CarbonInventoryLineStatus.DELETED },
    carbonInventory: { status: InventoryStatus.ACTIVE },
  },
} satisfies Prisma.CarbonInventoryLineInputWhereInput;

// What live captures and ACTIVE reduction initiatives hold on a value. Nothing
// cascades over these, so retiring a value they hold would leave them pointing
// at a DELETED row.
const HELD_BY_CAPTURES_OR_INITIATIVES = [
  { lineInputsAsSelection1: { some: LIVE_CAPTURE_WHERE } },
  { lineInputsAsSelection2: { some: LIVE_CAPTURE_WHERE } },
  {
    reductionPlanInitiativesAsDimension1: {
      some: { status: ReductionPlanInitiativeStatus.ACTIVE },
    },
  },
  {
    reductionPlanInitiativesAsDimension2: {
      some: { status: ReductionPlanInitiativeStatus.ACTIVE },
    },
  },
] satisfies Prisma.EmissionFactorDimensionValueWhereInput[];

/**
 * Returns a value matched by `where` that a live capture or an ACTIVE reduction
 * initiative references, or null. Deleting a whole dimension checks this: its
 * emission factor cascade is intended (the delete dialog announces it), but
 * nothing cleans up captures or initiatives.
 */
export const findValueHeldByCapturesOrInitiatives = (
  tx: Prisma.TransactionClient,
  where: Prisma.EmissionFactorDimensionValueWhereInput
) =>
  tx.emissionFactorDimensionValue.findFirst({
    where: { ...where, OR: HELD_BY_CAPTURES_OR_INITIATIVES },
    select: { value: true },
  });

/**
 * Returns a value matched by `where` that anything references — an active
 * emission factor, a live capture or an ACTIVE reduction initiative — or null.
 * Removing values from a dimension checks this, the same rule the maintainer
 * screen applies through `inUse`: an emission factor is deleted from its own
 * maintainer, never silently as a side effect of editing a dimension's
 * variables.
 */
export const findValueInUse = (
  tx: Prisma.TransactionClient,
  where: Prisma.EmissionFactorDimensionValueWhereInput
) =>
  tx.emissionFactorDimensionValue.findFirst({
    where: {
      ...where,
      OR: [
        {
          emissionFactorsAsDimension1: {
            some: { status: EmissionFactorStatus.ACTIVE },
          },
        },
        {
          emissionFactorsAsDimension2: {
            some: { status: EmissionFactorStatus.ACTIVE },
          },
        },
        ...HELD_BY_CAPTURES_OR_INITIATIVES,
      ],
    },
    select: { value: true },
  });
