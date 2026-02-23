import type { PrismaClient } from "@repo/database";
import type { GetAllMeasurementUnitsResponse } from "@repo/types";

export const getAllMeasurementUnitsService = async (
  prismaClient: PrismaClient
): Promise<GetAllMeasurementUnitsResponse> => {
  const data = await prismaClient.measurementUnit.findMany({
    orderBy: [{ name: "asc" }],
  });

  return data.map((item) => ({
    id: item.id.toString(),
    name: item.name,
    magnitude: item.magnitude,
    abbreviation: item.abbreviation,
    baseFactor: item.baseFactor,
    isBase: item.isBase,
  }));
};
