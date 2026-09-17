import { CarbonInventoryLineStatus, type Prisma } from "@repo/database";
import { CUSTOM_FACTOR_SOURCES } from "@/utils/index.js";

/**
 * Removes the frozen catalogue factor and the computed result of every line of
 * a footprint, so each line comes back asking for a factor.
 *
 * Called when the footprint's year changes. A factor applies only to footprints
 * of its own year, so keeping the frozen ones would leave a footprint showing a
 * complete, plausible total for the new year computed entirely from the previous
 * year's factors — and the capture cell would render blank anyway, because a
 * MUI `Select` paints a value that is not among its options as empty. Clearing
 * makes the incompleteness impossible to miss.
 *
 * What is kept:
 *  - the line itself, with its subcategory, dimension selections, measurement
 *    unit, quantity, comment and files. No replacement factor is ever chosen.
 *  - manual factors: their value and source were typed by the user and no
 *    catalogue can restore them, so the snapshot stays and so do `manualFactor`,
 *    `manualFactorSource` and `manualFactorRateUnitId` on the input. A manual
 *    factor is recognised by its source, not by its null `emissionFactorId`: a
 *    snapshot that lost its factor id but kept a catalogue source is a
 *    catalogue factor with a broken link, and leaving it behind would let a
 *    footprint keep a total computed from another year's factor -- the one
 *    thing this function exists to prevent. The backfill migration sweeps the
 *    same shape. A snapshot with no id and no source at all is left alone:
 *    nothing tells it apart from a manual factor whose source was never typed.
 *  - the superseded input versions, as the migration does: every reader filters
 *    `isActive: true`, so they are audit trail nothing in the application
 *    consults.
 *
 * Parked lines are covered as well as active ones. `toggleManualTotalEmissions`
 * holds non-direct lines as `OUTDATED` and reactivates them later without
 * passing through line synchronization, so an `OUTDATED` line left untouched
 * would carry a factor from another year back into an active footprint.
 */
export async function clearCatalogueFactorsOfLines(
  tx: Prisma.TransactionClient,
  carbonInventoryId: bigint
): Promise<void> {
  const staleFactors = await tx.carbonInventoryLineFactor.findMany({
    where: {
      OR: [
        { emissionFactorId: { not: null } },
        // A null source never matches `notIn`, so an untyped one is left alone.
        { appliedFactorSource: { notIn: [...CUSTOM_FACTOR_SOURCES] } },
      ],
      lineInput: {
        isActive: true,
        line: {
          carbonInventoryId,
          status: {
            in: [
              CarbonInventoryLineStatus.ACTIVE,
              CarbonInventoryLineStatus.OUTDATED,
            ],
          },
        },
      },
    },
    select: { id: true, lineInputId: true },
  });

  if (staleFactors.length === 0) return;

  const lineInputIds = staleFactors.map((factor) => factor.lineInputId);

  // The result of a factor-backed line is the quantity times the factor, so it
  // goes with the snapshot it was computed from.
  await tx.carbonInventoryLineResult.deleteMany({
    where: { lineInputId: { in: lineInputIds } },
  });

  await tx.carbonInventoryLineFactor.deleteMany({
    where: { id: { in: staleFactors.map((factor) => factor.id) } },
  });
}
