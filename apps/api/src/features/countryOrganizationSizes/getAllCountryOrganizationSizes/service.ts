import type { PrismaClient } from "@repo/database";
import type { GetAllCountryOrganizationSizesResponse } from "@repo/types";

export const getAllCountryOrganizationSizesService = async (
  prismaClient: PrismaClient
): Promise<GetAllCountryOrganizationSizesResponse> => {
  const sizes = await prismaClient.countryOrganizationSize.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      id: "asc",
    },
  });

  return sizes.map((size) => ({
    ...size,
    id: size.id.toString(),
  }));
};
