import { type PrismaClient, MeasurementUnitStatus } from "@repo/database";
import type { GetAllRateMeasurementUnitsResponse } from "@repo/types";

export const getAllRateMeasurementUnitsService = async (
  prismaClient: PrismaClient
): Promise<GetAllRateMeasurementUnitsResponse> => {
  const data = await prismaClient.rateMeasurementUnit.findMany({
    where: { status: MeasurementUnitStatus.ACTIVE },
    include: {
      numeratorMeasurementUnit: { include: { magnitude: true } },
      denominatorMeasurementUnit: { include: { magnitude: true } },
    },
    orderBy: {
      name: "asc",
    },
  });

  return data.map((item) => ({
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
  }));
};
