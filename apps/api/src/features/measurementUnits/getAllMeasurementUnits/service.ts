import {
  type PrismaClient,
  EmissionFactorStatus,
  MeasurementUnitStatus,
  SubcategoryStatus,
} from "@repo/database";
import type { GetAllMeasurementUnitsResponse } from "@repo/types";
import { mapMeasurementUnitToResponse } from "../mappers.js";
import { compareMeasurementUnitsForDisplay } from "./helpers.js";

export const getAllMeasurementUnitsService = async (
  prismaClient: PrismaClient
): Promise<GetAllMeasurementUnitsResponse> => {
  const measurementUnits = await prismaClient.measurementUnit.findMany({
    where: { status: MeasurementUnitStatus.ACTIVE },
    include: { magnitude: true },
  });

  if (measurementUnits.length === 0) return [];

  const muIds = measurementUnits.map((mu) => mu.id);

  // Find canonical RMU ids for all returned MUs (kg/<mu.abbreviation>)
  const canonicalRmus = await prismaClient.rateMeasurementUnit.findMany({
    where: {
      denominatorMeasurementUnitId: { in: muIds },
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
    prismaClient.carbonInventoryLineInput.groupBy({
      by: ["measurementUnitId"],
      where: { measurementUnitId: { in: muIds } },
      _count: { _all: true },
    }),
    prismaClient.subcategoryMeasurementUnit.groupBy({
      by: ["measurementUnitId"],
      // SubcategoryMeasurementUnit has no status column and its subcategory FK
      // is onDelete: Cascade, which does not fire on a soft-delete (we set
      // status = DELETED, the row survives). Filter by the parent subcategory's
      // status so join rows under soft-deleted subcategories stop counting —
      // otherwise the unit reports referenceCount > 0 and can't be deleted.
      where: {
        measurementUnitId: { in: muIds },
        subcategory: { status: SubcategoryStatus.ACTIVE },
      },
      _count: { _all: true },
    }),
    rmuIds.length > 0
      ? prismaClient.emissionFactor.groupBy({
          by: ["rateMeasurementUnitId"],
          // Emission factors are soft-deleted (status = DELETED) when their
          // subcategory is deleted, so exclude them or the rate unit stays
          // "in use" and undeletable.
          where: {
            rateMeasurementUnitId: { in: rmuIds },
            status: EmissionFactorStatus.ACTIVE,
          },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    rmuIds.length > 0
      ? prismaClient.carbonInventoryLineInput.groupBy({
          by: ["manualFactorRateUnitId"],
          where: { manualFactorRateUnitId: { in: rmuIds } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    rmuIds.length > 0
      ? prismaClient.carbonInventoryLineFactor.groupBy({
          by: ["appliedFactorRateUnitId"],
          where: { appliedFactorRateUnitId: { in: rmuIds } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ]);

  // Build lookup maps for direct MU references
  const lineInputCountByMuId = new Map(
    lineInputByMu
      .filter(
        (
          r
        ): r is typeof r & {
          measurementUnitId: NonNullable<(typeof r)["measurementUnitId"]>;
        } => r.measurementUnitId !== null
      )
      .map((r) => [r.measurementUnitId.toString(), r._count._all])
  );
  const subcategoryCountByMuId = new Map(
    subcategoryByMu.map((r) => [r.measurementUnitId.toString(), r._count._all])
  );

  // Build lookup maps for RMU references
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

  return measurementUnits
    .map((mu) => {
      const muIdStr = mu.id.toString();
      const rmuId = rmuIdByMuId.get(muIdStr);
      const rmuIdStr = rmuId?.toString() ?? "";

      const referenceCount =
        (lineInputCountByMuId.get(muIdStr) ?? 0) +
        (subcategoryCountByMuId.get(muIdStr) ?? 0) +
        (emissionFactorCountByRmuId.get(rmuIdStr) ?? 0) +
        (manualFactorCountByRmuId.get(rmuIdStr) ?? 0) +
        (appliedFactorCountByRmuId.get(rmuIdStr) ?? 0);

      return mapMeasurementUnitToResponse(mu, referenceCount);
    })
    .sort(compareMeasurementUnitsForDisplay);
};
