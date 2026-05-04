import { type PrismaClient, MeasurementUnitStatus } from "@repo/database";
import type { GetAllRateMeasurementUnitsResponse } from "@repo/types";

export const getAllRateMeasurementUnitsService = async (
  prismaClient: PrismaClient
): Promise<GetAllRateMeasurementUnitsResponse> => {
  const data = await prismaClient.rateMeasurementUnit.findMany({
    where: { status: MeasurementUnitStatus.ACTIVE },
    include: {
      numeratorMeasurementUnit: true,
      denominatorMeasurementUnit: true,
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
      magnitude: item.numeratorMeasurementUnit.magnitude,
      abbreviation: item.numeratorMeasurementUnit.abbreviation,
    },
    denominatorUnit: {
      id: item.denominatorMeasurementUnit.id.toString(),
      name: item.denominatorMeasurementUnit.name,
      magnitude: item.denominatorMeasurementUnit.magnitude,
      abbreviation: item.denominatorMeasurementUnit.abbreviation,
    },
  }));
};
