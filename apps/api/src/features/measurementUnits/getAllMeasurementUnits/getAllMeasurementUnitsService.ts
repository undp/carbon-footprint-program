import type { PrismaClient } from "@repo/database";
import type { GetAllMeasurementUnitsResponse } from "./getAllMeasurementUnitsSchema.js";

// --------------------------------------------------------------------------------
// OBJECTIVE: Handle the business logic for retrieving all measurement units.
// EXPLANATION:
// This function interacts with the database using Prisma. It receives the
// dependencies it needs (like the Prisma client) and the input data.
// It returns the data in the format expected by the handler.
// Keeping this logic separate from the handler makes it easier to test
// and reuse.
// --------------------------------------------------------------------------------

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
