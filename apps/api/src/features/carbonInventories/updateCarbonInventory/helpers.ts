import { CarbonInventoryLineStatus, type Prisma } from "@repo/database";
import { CUSTOM_FACTOR_SOURCES } from "@/utils/index.js";

/**
 * What counts as catalogue-backed, kept identical to the migration's
 * `emission_factor_id IS NOT NULL OR COALESCE(applied_factor_source,'') NOT IN
 * ('Otro')`.
 *
 * The second arm is not redundant: a snapshot damaged before the factor
 * identity was preserved (PR 647) lost its `emissionFactorId` but kept the real
 * catalogue source, and keying on the id alone would read it as manual. The
 * migration only clears those on footprints of another year, so the ones on
 * 2025 footprints — where the data is — reach this path intact. Missing them
 * here is permanent: the snapshot round-trips as `baseFactorId: null`, so no
 * later save reconciles it either, and the line keeps a factor of the previous
 * year while `carbon_inventory_subtotals_view` counts it as completed.
 *
 * Prisma's `notIn` does not match NULL, so the null arm is what reproduces the
 * migration's `COALESCE(..., '')`.
 */
const CATALOGUE_BACKED_SNAPSHOT = {
  OR: [
    { emissionFactorId: { not: null } },
    { appliedFactorSource: null },
    { appliedFactorSource: { notIn: CUSTOM_FACTOR_SOURCES } },
  ],
} satisfies Prisma.CarbonInventoryLineFactorWhereInput;

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
 *    catalogue can restore them, so the snapshot stays and so do
 *    `manualFactor`, `manualFactorSource` and `manualFactorRateUnitId` on the
 *    input. A manual factor is one whose source is custom — not merely one
 *    without an `emissionFactorId`, see below.
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
      ...CATALOGUE_BACKED_SNAPSHOT,
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
