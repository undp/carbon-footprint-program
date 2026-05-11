import { type PrismaClient, MeasurementUnitStatus } from "@repo/database";
import type { GetAllMeasurementUnitsResponse } from "@repo/types";
import { mapMeasurementUnitToResponse } from "../mappers.js";

export const getAllMeasurementUnitsService = async (
  prismaClient: PrismaClient
): Promise<GetAllMeasurementUnitsResponse> => {
  const measurementUnits = await prismaClient.measurementUnit.findMany({
    where: { status: MeasurementUnitStatus.ACTIVE },
    orderBy: [{ magnitude: { name: "asc" } }, { name: "asc" }],
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
      where: { measurementUnitId: { in: muIds } },
      _count: { _all: true },
    }),
    rmuIds.length > 0
      ? prismaClient.emissionFactor.groupBy({
          by: ["rateMeasurementUnitId"],
          where: { rateMeasurementUnitId: { in: rmuIds } },
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

  return measurementUnits.map((mu) => {
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
  });
};
