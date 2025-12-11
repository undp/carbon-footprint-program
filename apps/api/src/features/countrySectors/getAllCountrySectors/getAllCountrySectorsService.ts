import type { PrismaClient } from "@repo/database";
import type { GetAllCountrySectorsResponse } from "./getAllCountrySectorsSchema.js";

// --------------------------------------------------------------------------------
// OBJECTIVE: Handle the business logic for retrieving all country sectors.
// EXPLANATION:
// This function interacts with the database using Prisma. It receives the
// dependencies it needs (like the Prisma client) and the input data.
// It returns the data in the format expected by the handler.
// Keeping this logic separate from the handler makes it easier to test
// and reuse.
// --------------------------------------------------------------------------------

export const getAllCountrySectorsService = async (
  prismaClient: PrismaClient
): Promise<GetAllCountrySectorsResponse> => {
  const data = await prismaClient.country_sector.findMany({
    include: {
      country_subsectors: {
        orderBy: {
          name: "asc",
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return data.map((item) => ({
    id: item.id.toString(),
    name: item.name,
    subsectors: item.country_subsectors.map((subsector) => ({
      id: subsector.id.toString(),
      name: subsector.name,
    })),
  }));
};
