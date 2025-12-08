import type { PrismaClient } from "@repo/database";
import type { GetAllCountryOrganizationSizesResponse } from "./getAllCountryOrganizationSizesSchema.js";

// --------------------------------------------------------------------------------
// OBJECTIVE: Handle the business logic for retrieving all country organization sizes.
// EXPLANATION:
// This function interacts with the database using Prisma. It receives the
// dependencies it needs (like the Prisma client) and the input data.
// It returns the data in the format expected by the handler.
// Keeping this logic separate from the handler makes it easier to test
// and reuse.
// --------------------------------------------------------------------------------

export const getAllCountryOrganizationSizesService = async (
  prismaClient: PrismaClient
): Promise<GetAllCountryOrganizationSizesResponse | null> => {
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
