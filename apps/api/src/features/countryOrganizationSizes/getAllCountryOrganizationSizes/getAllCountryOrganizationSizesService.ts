import type { PrismaClient } from "@repo/database";
import type { GetAllCountryOrganizationSizesResponse } from "./getAllCountryOrganizationSizesSchema.js";

export const getAllCountryOrganizationSizesService = async (
  prismaClient: PrismaClient
): Promise<GetAllCountryOrganizationSizesResponse> => {
  const data = await prismaClient.country_organization_size.findMany({
    orderBy: {
      name: "asc",
    },
  });

  return data.map((item) => ({
    id: item.id.toString(),
    name: item.name,
  }));
};
