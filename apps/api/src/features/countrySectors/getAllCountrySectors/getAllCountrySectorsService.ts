import type { PrismaClient } from "@repo/database";
import type { GetAllCountrySectorsResponse } from "./getAllCountrySectorsSchema.js";

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
