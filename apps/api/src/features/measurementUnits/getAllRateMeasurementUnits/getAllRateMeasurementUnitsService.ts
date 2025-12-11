import type { PrismaClient } from "@repo/database";
import type { GetAllRateMeasurementUnitsResponse } from "./getAllRateMeasurementUnitsSchema.js";

// --------------------------------------------------------------------------------
// OBJECTIVE: Handle the business logic for retrieving all rate measurement units.
// EXPLANATION:
// This function interacts with the database using Prisma. It receives the
// dependencies it needs (like the Prisma client) and the input data.
// It returns the data in the format expected by the handler.
// Keeping this logic separate from the handler makes it easier to test
// and reuse.
// --------------------------------------------------------------------------------

export const getAllRateMeasurementUnitsService = async (
  prismaClient: PrismaClient
): Promise<GetAllRateMeasurementUnitsResponse> => {
  const data = await prismaClient.rate_measurement_unit.findMany({
    include: {
      numerator_measurement_unit: true,
      denominator_measurement_unit: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return data.map((item) => ({
    id: item.id.toString(),
    name: item.name,
    abbreviation: item.abbreviation,
    numerator_unit: {
      id: item.numerator_measurement_unit.id.toString(),
      name: item.numerator_measurement_unit.name,
      magnitude: item.numerator_measurement_unit.magnitude,
      abbreviation: item.numerator_measurement_unit.abbreviation,
    },
    denominator_unit: {
      id: item.denominator_measurement_unit.id.toString(),
      name: item.denominator_measurement_unit.name,
      magnitude: item.denominator_measurement_unit.magnitude,
      abbreviation: item.denominator_measurement_unit.abbreviation,
    },
  }));
};
