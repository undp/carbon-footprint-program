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

// Reference counts are read both from the list endpoint (no transaction) and
// from the create/update guards (inside a transaction), so the count helpers
// accept either client.
type MeasurementUnitDbClient = PrismaClient | Prisma.TransactionClient;

export const resolveKgMeasurementUnit = async (tx: TransactionClient) => {
  const kg = await tx.measurementUnit.findUnique({
    where: { abbreviation: "kg" },
  });
  if (!kg) throw new KgMeasurementUnitNotFoundError();
  return kg;
};

/**
 * The ONE definition of a measurement unit's reference count, batched into one
 * round-trip per reference type. The list endpoint passes every unit's id; the
 * create/update guards pass a single id via `getReferenceCount`. Both go through
 * here, so the displayed count and the edit guard can never drift.
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
 * - Inventory rows (line inputs and applied line factors) have no status of
 *   their own, but their owning `CarbonInventoryLine` and `CarbonInventory` do,
 *   and deleting an inventory is a soft delete → count only rows on an ACTIVE
 *   line of an ACTIVE inventory, so a soft-deleted inventory stops keeping the
 *   unit referenced (same intent as the subcategory case).
 */
export const getReferenceCountsByMeasurementUnit = async (
  client: MeasurementUnitDbClient,
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
        line: {
          status: CarbonInventoryLineStatus.ACTIVE,
          carbonInventory: { status: InventoryStatus.ACTIVE },
        },
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
            line: {
              status: CarbonInventoryLineStatus.ACTIVE,
              carbonInventory: { status: InventoryStatus.ACTIVE },
            },
          },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    rmuIds.length > 0
      ? client.carbonInventoryLineFactor.groupBy({
          by: ["appliedFactorRateUnitId"],
          where: {
            appliedFactorRateUnitId: { in: rmuIds },
            lineInput: {
              line: {
                status: CarbonInventoryLineStatus.ACTIVE,
                carbonInventory: { status: InventoryStatus.ACTIVE },
              },
            },
          },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ]);

  const lineInputCountByMuId = new Map(
    lineInputByMu
      .filter((r) => r.measurementUnitId !== null)
      .map((r) => [r.measurementUnitId!.toString(), r._count._all])
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
 * version so the create/update guards and the list endpoint share one definition.
 */
export const getReferenceCount = async (
  client: MeasurementUnitDbClient,
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
