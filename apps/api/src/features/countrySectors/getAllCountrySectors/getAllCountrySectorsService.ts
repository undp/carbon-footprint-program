import type { PrismaClient } from "@repo/database";
import type { GetAllCountrySectorsResponse } from "@repo/types";

export const getAllCountrySectorsService = async (
  prismaClient: PrismaClient
): Promise<GetAllCountrySectorsResponse> => {
  const sectors = await prismaClient.countrySector.findMany({
    select: {
      id: true,
      name: true,
      subsectors: {
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: "asc",
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return sectors.map((sector) => ({
    ...sector,
    id: sector.id.toString(),
    subsectors: sector.subsectors.map((subsector) => ({
      ...subsector,
      id: subsector.id.toString(),
    })),
  }));
};
