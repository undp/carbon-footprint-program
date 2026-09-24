import type { Prisma } from "@repo/database";
import {
  CarbonInventoryLineStatus,
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

/**
 * Returns a value matched by `where` that a live capture or an ACTIVE reduction
 * initiative references, or null. Retiring a value cascades over emission
 * factors, but nothing cleans up captures or initiatives, which would be left
 * pointing at a DELETED row — so the paths that retire values (removing one
 * from a dimension, deleting the whole dimension) refuse when this finds one.
 */
export const findValueInLiveUse = (
  tx: Prisma.TransactionClient,
  where: Prisma.EmissionFactorDimensionValueWhereInput
) =>
  tx.emissionFactorDimensionValue.findFirst({
    where: {
      ...where,
      OR: [
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
      ],
    },
    select: { value: true },
  });
