import {
  type PrismaClient,
  EmissionFactorStatus,
  MeasurementUnitStatus,
} from "@repo/database";
import type { GetAllRateMeasurementUnitsResponse } from "@repo/types";
import { activeLineInputFilter } from "../helpers.js";
import { buildCountMapFromGroups } from "./helpers.js";

export const getAllRateMeasurementUnitsService = async (
  prismaClient: PrismaClient
): Promise<GetAllRateMeasurementUnitsResponse> => {
  const [rateMeasurementUnits, emissionFactorGroups, lineFactorAppliedGroups] =
    await Promise.all([
      prismaClient.rateMeasurementUnit.findMany({
        where: { status: MeasurementUnitStatus.ACTIVE },
        include: {
          numeratorMeasurementUnit: { include: { magnitude: true } },
          denominatorMeasurementUnit: { include: { magnitude: true } },
        },
        orderBy: { name: "asc" },
      }),
      prismaClient.emissionFactor.groupBy({
        by: ["rateMeasurementUnitId"],
        // Emission factors are soft-deleted when their subcategory is deleted,
        // so exclude them or the rate unit stays "in use" and undeletable.
        where: { status: EmissionFactorStatus.ACTIVE },
        _count: { _all: true },
      }),
      prismaClient.carbonInventoryLineFactor.groupBy({
        by: ["appliedFactorRateUnitId"],
        where: { lineInput: activeLineInputFilter },
        _count: { _all: true },
      }),
    ]);

  const emissionFactorCountByRmuId = buildCountMapFromGroups(
    emissionFactorGroups,
    (g) => g.rateMeasurementUnitId.toString()
  );
  const lineFactorAppliedCountByRmuId = buildCountMapFromGroups(
    lineFactorAppliedGroups,
    (g) => g.appliedFactorRateUnitId.toString()
  );

  return rateMeasurementUnits.map((item) => {
    const idStr = item.id.toString();
    const emissionFactors = emissionFactorCountByRmuId.get(idStr) ?? 0;
    const lineFactorsAsApplied = lineFactorAppliedCountByRmuId.get(idStr) ?? 0;
    const totalReferenceCount = emissionFactors + lineFactorsAsApplied;

    return {
      id: item.id.toString(),
      name: item.name,
      abbreviation: item.abbreviation,
      status: item.status,
      numeratorUnit: {
        id: item.numeratorMeasurementUnit.id.toString(),
        name: item.numeratorMeasurementUnit.name,
        magnitudeId: item.numeratorMeasurementUnit.magnitudeId.toString(),
        abbreviation: item.numeratorMeasurementUnit.abbreviation,
        magnitude: {
          id: item.numeratorMeasurementUnit.magnitude.id.toString(),
          code: item.numeratorMeasurementUnit.magnitude.code,
          name: item.numeratorMeasurementUnit.magnitude.name,
          isSystem: item.numeratorMeasurementUnit.magnitude.isSystem,
          status: item.numeratorMeasurementUnit.magnitude.status,
        },
      },
      denominatorUnit: {
        id: item.denominatorMeasurementUnit.id.toString(),
        name: item.denominatorMeasurementUnit.name,
        magnitudeId: item.denominatorMeasurementUnit.magnitudeId.toString(),
        abbreviation: item.denominatorMeasurementUnit.abbreviation,
        magnitude: {
          id: item.denominatorMeasurementUnit.magnitude.id.toString(),
          code: item.denominatorMeasurementUnit.magnitude.code,
          name: item.denominatorMeasurementUnit.magnitude.name,
          isSystem: item.denominatorMeasurementUnit.magnitude.isSystem,
          status: item.denominatorMeasurementUnit.magnitude.status,
        },
      },
      referenceCounts: {
        emissionFactors,
        lineFactorsAsApplied,
      },
      totalReferenceCount,
    };
  });
};
