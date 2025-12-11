import type { PrismaClient } from "@repo/database";
import type { GetAllMeasurementUnitsResponse } from "./getAllMeasurementUnitsSchema.js";

export const getAllMeasurementUnitsService = async (
  prismaClient: PrismaClient
): Promise<GetAllMeasurementUnitsResponse> => {
  const data = await prismaClient.measurement_unit.findMany({
    orderBy: [
      {
        magnitude: "asc",
      },
      {
        name: "asc",
      },
    ],
  });

  return data.map((item) => ({
    id: item.id.toString(),
    name: item.name,
    magnitude: item.magnitude,
    abbreviation: item.abbreviation,
    base_factor: item.factor_base,
    is_base: item.is_base,
  }));
};
