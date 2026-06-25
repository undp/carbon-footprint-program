import {
  type MeasurementUnit,
  type Prisma,
  type PrismaClient,
  CarbonInventoryLineStatus,
  EmissionFactorStatus,
  InventoryStatus,
  SubcategoryStatus,
} from "@repo/database";
import {
  KgMeasurementUnitNotFoundError,
  KgMeasurementUnitImmutableError,
  BaseUnitImmutableError,
} from "./errors.js";

type TransactionClient = Prisma.TransactionClient;

export const resolveKgMeasurementUnit = async (tx: TransactionClient) => {
  const kg = await tx.measurementUnit.findUnique({
    where: { abbreviation: "kg" },
  });
  if (!kg) throw new KgMeasurementUnitNotFoundError();
  return kg;
};

/**
 * A line input keeps a unit referenced only while it's the live revision
 * (`isActive`) and both its line and inventory are ACTIVE. Editing a line
 * supersedes the old input, and soft-deleting an inventory/line hides
 * everything under it — any of the three flips makes the reference dead.
 * Shared so the list helper and the rates service can't drift on what a
 * "live input" is.
 */
export const activeLineInputFilter = {
  isActive: true,
  line: {
    status: CarbonInventoryLineStatus.ACTIVE,
    carbonInventory: { status: InventoryStatus.ACTIVE },
  },
} satisfies Prisma.CarbonInventoryLineInputWhereInput;

/**
 * The ONE definition of a measurement unit's reference count, batched into one
 * round-trip per reference type. The list endpoint passes every unit's id with
 * a plain client; the create/update and delete guards pass a single id with a
 * transaction client via `getMeasurementUnitReferenceCount`. Both go through
 * here, so the displayed count and the edit/delete guards can never drift.
 *
 * A unit is referenced by: line inputs that use it directly, ACTIVE subcategory
 * links, and — through its canonical RMU (kg/<abbr>) — ACTIVE emission factors,
 * line-input manual factors and applied line factors.
 *
 * Soft-deleted dependents must NOT count, and every reference type carries its
 * soft-delete signal one level up, so each query filters by the parent:
 * - `SubcategoryMeasurementUnit` has no status of its own → filter by the parent
 *   subcategory's status.
 * - Emission factors are soft-deleted (status = DELETED) when their subcategory
 *   is deleted → filter by the factor's own status.
 * - Line inputs carry their own soft-delete flag, `isActive`: editing a line
 *   supersedes the old input (`isActive = false`) and inserts a new active one,
 *   so count only `isActive` inputs (everything else reads them as gone too).
 * - Inventory rows (line inputs and applied line factors) also have no *status*
 *   of their own, but their owning `CarbonInventoryLine` and `CarbonInventory`
 *   do, and deleting an inventory is a soft delete → count only rows on an
 *   ACTIVE line of an ACTIVE inventory. Together: a superseded input, or a row
 *   under a soft-deleted line/inventory, stops keeping the unit referenced (same
 *   intent as the subcategory case).
 */
export const getReferenceCountsByMeasurementUnit = async (
  client: PrismaClient | Prisma.TransactionClient,
  measurementUnitIds: bigint[]
): Promise<Map<string, number>> => {
  const uniqueMuIds = [
    ...new Map(measurementUnitIds.map((id) => [id.toString(), id])).values(),
  ];
  if (uniqueMuIds.length === 0) return new Map();

  // Find the canonical RMU (kg/<abbr>) for each unit; the rate-unit-side
  // references are counted against it.
  const canonicalRmus = await client.rateMeasurementUnit.findMany({
    where: {
      denominatorMeasurementUnitId: { in: uniqueMuIds },
      numeratorMeasurementUnit: { abbreviation: "kg" },
    },
    select: { id: true, denominatorMeasurementUnitId: true },
  });

  const rmuIds = canonicalRmus.map((r) => r.id);
  const rmuIdByMuId = new Map(
    canonicalRmus.map((r) => [r.denominatorMeasurementUnitId.toString(), r.id])
  );

  const [
    lineInputByMu,
    subcategoryByMu,
    emissionFactorByRmu,
    manualFactorByRmu,
    appliedFactorByRmu,
  ] = await Promise.all([
    client.carbonInventoryLineInput.groupBy({
      by: ["measurementUnitId"],
      where: {
        measurementUnitId: { in: uniqueMuIds },
        ...activeLineInputFilter,
      },
      _count: { _all: true },
    }),
    client.subcategoryMeasurementUnit.groupBy({
      by: ["measurementUnitId"],
      where: {
        measurementUnitId: { in: uniqueMuIds },
        subcategory: { status: SubcategoryStatus.ACTIVE },
      },
      _count: { _all: true },
    }),
    rmuIds.length > 0
      ? client.emissionFactor.groupBy({
          by: ["rateMeasurementUnitId"],
          where: {
            rateMeasurementUnitId: { in: rmuIds },
            status: EmissionFactorStatus.ACTIVE,
          },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    rmuIds.length > 0
      ? client.carbonInventoryLineInput.groupBy({
          by: ["manualFactorRateUnitId"],
          where: {
            manualFactorRateUnitId: { in: rmuIds },
            ...activeLineInputFilter,
          },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    rmuIds.length > 0
      ? client.carbonInventoryLineFactor.groupBy({
          by: ["appliedFactorRateUnitId"],
          where: {
            appliedFactorRateUnitId: { in: rmuIds },
            lineInput: activeLineInputFilter,
          },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ]);

  const lineInputCountByMuId = new Map(
    lineInputByMu
      .filter(
        (r): r is typeof r & { measurementUnitId: bigint } =>
          r.measurementUnitId !== null
      )
      .map((r) => [r.measurementUnitId.toString(), r._count._all])
  );
  const subcategoryCountByMuId = new Map(
    subcategoryByMu.map((r) => [r.measurementUnitId.toString(), r._count._all])
  );
  const emissionFactorCountByRmuId = new Map(
    emissionFactorByRmu.map((r) => [
      r.rateMeasurementUnitId.toString(),
      r._count._all,
    ])
  );
  const manualFactorCountByRmuId = new Map(
    manualFactorByRmu
      // Typed as nullable from the conditional groupBy union, but the
      // `manualFactorRateUnitId: { in: rmuIds }` filter guarantees non-null.
      // A type predicate can't narrow here (unlike the unconditional
      // line-input count above): the `Promise.resolve([])` branch makes this a
      // `never[]` union that defeats the guard, so keep the `!`.
      .filter((r) => r.manualFactorRateUnitId !== null)
      .map((r) => [r.manualFactorRateUnitId!.toString(), r._count._all])
  );
  const appliedFactorCountByRmuId = new Map(
    appliedFactorByRmu.map((r) => [
      r.appliedFactorRateUnitId.toString(),
      r._count._all,
    ])
  );

  return new Map(
    uniqueMuIds.map((id) => {
      const muIdStr = id.toString();
      const rmuIdStr = rmuIdByMuId.get(muIdStr)?.toString() ?? "";
      const count =
        (lineInputCountByMuId.get(muIdStr) ?? 0) +
        (subcategoryCountByMuId.get(muIdStr) ?? 0) +
        (emissionFactorCountByRmuId.get(rmuIdStr) ?? 0) +
        (manualFactorCountByRmuId.get(rmuIdStr) ?? 0) +
        (appliedFactorCountByRmuId.get(rmuIdStr) ?? 0);
      return [muIdStr, count] as const;
    })
  );
};

/**
 * Reference count for a single measurement unit. Thin wrapper over the batched
 * version so the create/update/delete guards and the list endpoint share one
 * definition.
 */
export const getMeasurementUnitReferenceCount = async (
  client: PrismaClient | Prisma.TransactionClient,
  measurementUnitId: bigint
): Promise<number> =>
  (await getReferenceCountsByMeasurementUnit(client, [measurementUnitId])).get(
    measurementUnitId.toString()
  ) ?? 0;

export const buildCanonicalRmuFields = (
  mu: Pick<MeasurementUnit, "abbreviation">
) => ({
  abbreviation: `kg/${mu.abbreviation}`,
  name: `kg por ${mu.abbreviation}`,
});

export const assertNotKgMu = (mu: Pick<MeasurementUnit, "abbreviation">) => {
  if (mu.abbreviation === "kg") throw new KgMeasurementUnitImmutableError();
};

export const assertNotBaseUnit = (mu: Pick<MeasurementUnit, "isBase">) => {
  if (mu.isBase) throw new BaseUnitImmutableError();
};
